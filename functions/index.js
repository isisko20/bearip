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

async function verifyUser(req) {
  const header = req.get('authorization') || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) throw new ApiError(401, 'unauthenticated', '로그인 정보를 확인하지 못했어요. 페이지를 새로고침해주세요.');
  try {
    return (await admin.auth().verifyIdToken(match[1])).uid;
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

function makeEndpoint(handler, secrets) {
  return onRequest({ region: REGION, secrets, maxInstances: 3, timeoutSeconds: 90, memory: '256MiB' }, async (req, res) => {
    applyCors(req, res);
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    try {
      if (req.method !== 'POST') throw new ApiError(405, 'method', 'POST만 지원해요.');
      const uid = await verifyUser(req);
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      res.json(await handler(uid, body));
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
