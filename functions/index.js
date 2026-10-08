// Thinkit AI 시나리오 도우미 — 브라우저에는 API 키를 둘 수 없어서 이 함수가 대신 호출해요.
//   aiAssist : 동의 확인 → 하루 횟수 확인 → 매뉴얼 + 내 IP 정보 + 질문으로 Gemma 호출
//   aiAdmin  : GM(PIN 확인)만 AI 켜기/끄기와 하루 한도 조정
// 매뉴얼(functions/manuals)은 공개 저장소에 올리지 않고(.gitignore) 배포할 때만 함께 올라가요.
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const lib = require('./lib');

admin.initializeApp({ databaseURL: 'https://thinkit-ccb2e-default-rtdb.firebaseio.com' });
const db = admin.database();
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

const REGION = 'asia-northeast3';
const MODEL = 'gemma-4-26b-a4b-it'; // 모델을 바꾸려면 이 한 줄만 고치면 돼요 (예: gemma-4-31b-it — 더 정교하지만 느려요)
const CONSENT_VERSION = 1;
const DEFAULT_CONFIG = { enabled: true, dailyPerUser: 10, globalDaily: 200 };
const ALLOWED_ORIGINS = ['https://isisko20.github.io', 'http://localhost:5173'];
const MAX_ADMIN_FAILS_PER_DAY = 20;

const MANUAL = fs.readFileSync(path.join(__dirname, 'manuals', 'story-design.txt'), 'utf8');
const SYSTEM_PROMPT = lib.buildSystemPrompt(MANUAL);

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function applyCors(req, res) {
  const origin = req.get('origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
}

// 로그인 증표(ID 토큰)를 확인해서 풀어낸 내용(uid와 닉네임 claim 등)을 돌려줘요.
async function verifyUser(req) {
  const header = req.get('authorization') || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) throw new ApiError(401, 'unauthenticated', '로그인 정보를 확인하지 못했어요. 페이지를 새로고침해주세요.');
  try {
    return await admin.auth().verifyIdToken(match[1]);
  } catch (e) {
    throw new ApiError(401, 'unauthenticated', '로그인 정보를 확인하지 못했어요. 페이지를 새로고침해주세요.');
  }
}

async function getConfig() {
  const snap = await db.ref('aiConfig').once('value');
  return Object.assign({}, DEFAULT_CONFIG, snap.val() || {});
}

// 카운터를 한도 안에서만 올려요 (트랜잭션이라 동시에 눌러도 한도를 넘지 않아요).
async function reserve(refPath, limit) {
  const result = await db.ref(refPath).transaction((cur) => ((cur || 0) >= limit ? undefined : (cur || 0) + 1));
  return result.committed;
}
async function release(refPath) {
  await db.ref(refPath).transaction((cur) => Math.max(0, (cur || 0) - 1));
}

async function callGemma(userPrompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 80000);
  let resp;
  let apiKey = '';
  try {
    apiKey = GEMINI_API_KEY.value().trim();
    resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 1500, temperature: 0.8 },
      }),
      signal: controller.signal,
    });
  } catch (e) {
    // 키 값은 절대 로그에 남기지 않고, 원인 파악에 필요한 종류·길이·이상 문자 수만 남겨요.
    const odd = (apiKey.match(/[^\x21-\x7e]/g) || []).length;
    console.error('Gemma fetch failed:', e && e.name, e && e.cause && e.cause.code, 'keyLen', apiKey.length, 'nonPrintable', odd);
    throw new ApiError(502, 'ai_error', 'AI 응답이 늦어지고 있어요. 잠시 후 다시 시도해주세요.');
  } finally {
    clearTimeout(timer);
  }
  if (resp.status === 429) throw new ApiError(429, 'ai_busy', '지금 AI 이용이 몰려 있어요. 잠시 후 다시 시도해주세요.');
  if (!resp.ok) {
    // 구글 오류 본문에는 키가 들어 있지 않아요. 원인 파악용으로 앞부분만 남겨요.
    const detail = (await resp.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400);
    console.error('Gemma API error', resp.status, detail);
    throw new ApiError(502, 'ai_error', 'AI 호출에 실패했어요. 잠시 후 다시 시도해주세요.');
  }
  const answer = lib.extractAnswer(await resp.json());
  if (!answer.text) {
    throw new ApiError(
      502,
      'ai_empty',
      answer.blocked ? '이 질문에는 답변할 수 없어요. 표현을 바꿔서 다시 질문해주세요.' : 'AI가 답변을 만들지 못했어요. 다시 시도해주세요.'
    );
  }
  return answer.text;
}

async function remainingFor(uid, config) {
  const used = (await db.ref(`aiUsage/${lib.kstDate()}/uid/${uid}`).once('value')).val() || 0;
  return Math.max(0, config.dailyPerUser - used);
}

async function handleAssist(uid, body) {
  const config = await getConfig();
  const action = body.action || 'ask';
  const consentRef = db.ref(`aiConsent/${uid}`);

  if (action === 'revoke') {
    await consentRef.remove();
    return { ok: true, consent: false };
  }
  if (action === 'consent') {
    await consentRef.set({ agreedAt: new Date().toISOString(), version: CONSENT_VERSION, nickname: lib.clip(body.nickname, 20) });
    return { ok: true, consent: true };
  }

  const consent = (await consentRef.once('value')).val();
  const hasConsent = !!consent && consent.version === CONSENT_VERSION;
  if (action === 'status') {
    return { ok: true, enabled: !!config.enabled, consent: hasConsent, remaining: await remainingFor(uid, config) };
  }

  if (!config.enabled) throw new ApiError(503, 'disabled', 'AI 기능이 잠시 꺼져 있어요. 나중에 다시 이용해주세요.');
  if (!hasConsent) throw new ApiError(403, 'consent_required', '먼저 안내 사항에 동의해주세요.');
  const question = lib.clip(body.question, 1000);
  if (question.length < 2) throw new ApiError(400, 'bad_request', '질문을 입력해주세요.');

  const date = lib.kstDate();
  const globalPath = `aiUsage/${date}/global`;
  const userPath = `aiUsage/${date}/uid/${uid}`;
  if (!(await reserve(globalPath, config.globalDaily))) {
    throw new ApiError(429, 'limit_global', '오늘 전체 AI 이용 한도에 도달했어요. 내일 다시 이용해주세요.');
  }
  if (!(await reserve(userPath, config.dailyPerUser))) {
    await release(globalPath);
    throw new ApiError(429, 'limit_user', `오늘 이용 가능한 ${config.dailyPerUser}회를 모두 썼어요. 내일 다시 이용해주세요.`);
  }

  let answer;
  try {
    answer = await callGemma(lib.buildUserPrompt(lib.sanitizeIp(body.ip), question));
  } catch (e) {
    // 실패한 호출은 횟수를 차감하지 않아요.
    await Promise.all([release(globalPath), release(userPath)]);
    throw e;
  }
  return { ok: true, answer, remaining: await remainingFor(uid, config) };
}

async function handleAdmin(uid, body) {
  const date = lib.kstDate();
  const failPath = `aiAdminFails/${date}`;
  const fails = (await db.ref(failPath).once('value')).val() || 0;
  if (fails >= MAX_ADMIN_FAILS_PER_DAY) throw new ApiError(429, 'locked', '오늘은 관리자 인증 시도 한도를 넘었어요. 내일 다시 시도해주세요.');

  const account = (await db.ref('accounts/GM').once('value')).val();
  if (!account || !lib.verifyPin('GM', body.pin, account)) {
    await db.ref(failPath).transaction((cur) => (cur || 0) + 1);
    throw new ApiError(403, 'bad_pin', 'GM PIN이 맞지 않아요.');
  }

  if (body.action === 'set') {
    const next = {};
    if (typeof body.enabled === 'boolean') next.enabled = body.enabled;
    const perUser = Number(body.dailyPerUser);
    const globalDaily = Number(body.globalDaily);
    if (Number.isInteger(perUser) && perUser >= 0 && perUser <= 100) next.dailyPerUser = perUser;
    if (Number.isInteger(globalDaily) && globalDaily >= 0 && globalDaily <= 2000) next.globalDaily = globalDaily;
    if (Object.keys(next).length) await db.ref('aiConfig').update(next);
  }

  const config = await getConfig();
  const usedToday = (await db.ref(`aiUsage/${date}/global`).once('value')).val() || 0;
  return { ok: true, config, usedToday, model: MODEL };
}

// ---- 서버 로그인 (닉네임 + PIN) ----
// 계정(accounts)은 이제 서버만 읽고 써요. PIN이 맞으면 "이 닉네임 본인"이라는 증표(커스텀
// 토큰)를 발급하고, 그 증표의 claim(nk=경로 키용 닉네임, nick=원래 닉네임)을 데이터베이스
// 규칙이 믿고 써서 쪽지·알림·신고를 진짜로 잠가요 (database.rules.json 참고).
async function assertNotLocked(nk) {
  const state = (await db.ref('authFails/' + nk).once('value')).val();
  if (lib.isLocked(state)) {
    const mins = Math.max(1, Math.ceil((state.lockedUntil - Date.now()) / 60000));
    throw new ApiError(429, 'locked', `PIN을 여러 번 틀려서 잠시 잠겼어요. 약 ${mins}분 뒤에 다시 시도해주세요.`);
  }
}
async function recordPinFailure(nk) {
  await db.ref('authFails/' + nk).transaction((cur) => lib.nextFailState(cur));
}

async function issueToken(nickname) {
  try {
    return await admin.auth().createCustomToken(lib.uidFor(nickname), { nk: lib.safeSegment(nickname), nick: nickname });
  } catch (e) {
    console.error('createCustomToken failed:', e && e.code, e && e.message);
    throw new ApiError(500, 'token_error', '로그인 증표를 만들지 못했어요. 운영자에게 알려주세요.');
  }
}

async function handleAuthLogin(_uid, body) {
  const nickname = lib.normalizeNickname(body.nickname);
  if (!nickname) throw new ApiError(400, 'bad_nickname', '닉네임을 입력해주세요.');
  const nk = lib.safeSegment(nickname);
  const acctRef = db.ref('accounts/' + nk);
  const account = (await acctRef.once('value')).val();
  // 경로 키가 같은 다른 닉네임(예: "a.b"와 "a_b")은 서로 다른 사람의 계정으로 취급해요.
  const sameOwner = !account || !account.nickname || account.nickname === nickname;
  const takenError = new ApiError(409, 'nickname_taken', '이미 다른 분이 사용 중인 닉네임이에요. 다른 닉네임을 써주세요.');

  if (body.action === 'check') return { ok: true, exists: !!account };

  if (body.action === 'register') {
    if (!lib.validPin(body.pin)) throw new ApiError(400, 'bad_pin_format', `PIN은 ${lib.PIN_MIN_LENGTH}자 이상 입력해주세요.`);
    if (account) throw takenError;
    const record = lib.makeAccountRecord(nickname, body.pin);
    // 트랜잭션이라 같은 닉네임을 동시에 만들려 해도 먼저 들어온 한 명만 성공해요.
    const tx = await acctRef.transaction((cur) => (cur ? undefined : record));
    if (!tx.committed) throw takenError;
    return { ok: true, nickname, token: await issueToken(nickname) };
  }

  if (body.action === 'login') {
    if (!account) throw new ApiError(404, 'no_account', '아직 만들어지지 않은 닉네임이에요.');
    if (!sameOwner) throw takenError;
    await assertNotLocked(nk);
    if (!lib.validPin(body.pin) || !lib.verifyPin(nickname, body.pin, account)) {
      await recordPinFailure(nk);
      throw new ApiError(403, 'bad_pin', 'PIN이 맞지 않아요.');
    }
    await db.ref('authFails/' + nk).remove();
    if (!account.nickname) await acctRef.child('nickname').set(nickname); // 예전에 만든 계정에 닉네임 기록을 보강해요
    return { ok: true, nickname, token: await issueToken(nickname) };
  }
  throw new ApiError(400, 'bad_action', '지원하지 않는 요청이에요.');
}

// 로그인한 본인의 계정 관리 — PIN을 한 번 더 확인해요 (확인, PIN 변경, 계정 삭제).
async function handleAuthAccount(uid, body, decoded) {
  const nk = decoded && decoded.nk;
  const nickname = decoded && decoded.nick;
  if (!nk || !nickname) throw new ApiError(401, 'need_login', 'PIN으로 로그인한 뒤에 사용할 수 있어요.');
  const acctRef = db.ref('accounts/' + nk);
  const account = (await acctRef.once('value')).val();
  if (!account) throw new ApiError(404, 'no_account', '계정을 찾지 못했어요.');
  await assertNotLocked(nk);
  if (!lib.validPin(body.pin) || !lib.verifyPin(nickname, body.pin, account)) {
    await recordPinFailure(nk);
    throw new ApiError(403, 'bad_pin', 'PIN이 맞지 않아요.');
  }
  await db.ref('authFails/' + nk).remove();

  if (body.action === 'verifyPin') return { ok: true };

  if (body.action === 'changePin') {
    if (!lib.validPin(body.newPin)) throw new ApiError(400, 'bad_pin_format', `새 PIN은 ${lib.PIN_MIN_LENGTH}자 이상 입력해주세요.`);
    const record = lib.makeAccountRecord(nickname, body.newPin);
    record.createdAt = account.createdAt || record.createdAt;
    await acctRef.set(record);
    return { ok: true };
  }

  if (body.action === 'deleteAccount') {
    // 사용자 데이터(IP, 댓글 등)는 화면에서 먼저 지우고 오고, 여기서는 계정 자체와 서버에만
    // 있는 기록을 정리해요. 이후 같은 닉네임을 다시 만들 수 있어요.
    const usage = (await db.ref('aiUsage').once('value')).val() || {};
    const removals = [
      acctRef.remove(),
      db.ref('notifications/' + nk).remove(),
      db.ref('userThreads/' + nk).remove(),
      db.ref('aiConsent/' + uid).remove(),
      db.ref('authFails/' + nk).remove(),
      ...Object.keys(usage).map((date) => db.ref(`aiUsage/${date}/uid/${uid}`).remove()),
    ];
    await Promise.all(removals);
    await admin.auth().deleteUser(uid).catch(() => {});
    return { ok: true };
  }
  throw new ApiError(400, 'bad_action', '지원하지 않는 요청이에요.');
}

function makeEndpoint(handler, secrets, opts = {}) {
  const { requireAuth = true, timeoutSeconds = 90 } = opts;
  return onRequest({ region: REGION, secrets, maxInstances: 3, timeoutSeconds, memory: '256MiB' }, async (req, res) => {
    applyCors(req, res);
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    try {
      if (req.method !== 'POST') throw new ApiError(405, 'method', 'POST만 지원해요.');
      const decoded = requireAuth ? await verifyUser(req) : null;
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      res.json(await handler(decoded ? decoded.uid : null, body, decoded));
    } catch (e) {
      if (e instanceof ApiError) {
        res.status(e.status).json({ ok: false, error: e.code, message: e.message });
      } else {
        console.error('unexpected', e && e.message);
        res.status(500).json({ ok: false, error: 'server_error', message: '서버 오류가 났어요. 잠시 후 다시 시도해주세요.' });
      }
    }
  });
}

exports.aiAssist = makeEndpoint(handleAssist, [GEMINI_API_KEY]);
exports.aiAdmin = makeEndpoint(handleAdmin, []);
// 로그인 전에 부르는 함수라 로그인 증표를 요구하지 않아요 — 대신 PIN 5회 실패 잠금이 보호해요.
exports.authLogin = makeEndpoint(handleAuthLogin, [], { requireAuth: false, timeoutSeconds: 30 });
exports.authAccount = makeEndpoint(handleAuthAccount, [], { timeoutSeconds: 60 });
