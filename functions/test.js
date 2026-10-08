// 서버 함수의 순수 로직 검증: node test.js
const assert = require('assert');
const crypto = require('crypto');
const lib = require('./lib');

// 1) 로그인 화면(WebCrypto)과 PIN 해시가 정확히 같은 값을 내는지
(async () => {
  const nickname = 'GM';
  const pin = '비밀pin12';
  const salt = crypto.randomBytes(16).toString('hex');
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt + ':' + nickname), iterations: 100000 },
    key,
    256
  );
  const pinHash = Buffer.from(bits).toString('hex');
  const account = { pinHash, salt, iterations: 100000 };
  assert.strictEqual(lib.verifyPin(nickname, pin, account), true, 'WebCrypto 해시와 서버 검증이 일치해야 해요');
  assert.strictEqual(lib.verifyPin(nickname, pin + 'x', account), false);
  assert.strictEqual(lib.verifyPin('Gm', pin, account), false, '닉네임이 다르면 실패');
  assert.strictEqual(lib.verifyPin(nickname, pin, null), false);
  console.log('ok  PIN 검증 (WebCrypto 호환)');

  // 2) IP 정보 정리: 길이 제한, 문자열 강제, 이상한 입력
  const ip = lib.sanitizeIp({
    title: 'T'.repeat(500),
    goal: { evil: 1 },
    genres: ['판타지', '로맨스', ...Array(20).fill('x')],
    logline: 'L'.repeat(5000),
    episodes: Array(50).fill('회차'),
  });
  assert.strictEqual(ip.title.length, 100);
  assert.strictEqual(ip.genres.length, 8);
  assert.strictEqual(ip.logline.length, 500);
  assert.strictEqual(ip.episodes.length, 10);
  assert.strictEqual(typeof ip.goal, 'string');
  assert.deepStrictEqual(lib.sanitizeIp(null).genres, []);
  assert.deepStrictEqual(lib.sanitizeIp('문자열').episodes, []);
  console.log('ok  IP 정보 정리');

  // 3) 프롬프트 구성
  const sys = lib.buildSystemPrompt('매뉴얼 본문 ABC');
  assert.ok(sys.includes('매뉴얼 본문 ABC') && sys.includes('시나리오 도우미'));
  const user = lib.buildUserPrompt(lib.sanitizeIp({ title: '내 작품', genres: ['판타지'] }), '  세계관 점검해줘  ');
  assert.ok(user.includes('제목: 내 작품') && user.includes('[질문]\n세계관 점검해줘'));
  console.log('ok  프롬프트 구성');

  // 4) 응답 파싱: 생각 파트 제외, 차단 사유
  assert.strictEqual(
    lib.extractAnswer({ candidates: [{ content: { parts: [{ text: '속마음', thought: true }, { text: '답변' }, { text: ' 이어서' }] } }] }).text,
    '답변 이어서'
  );
  assert.strictEqual(lib.extractAnswer({ promptFeedback: { blockReason: 'SAFETY' } }).blocked, 'SAFETY');
  assert.strictEqual(lib.extractAnswer({}).text, '');
  console.log('ok  응답 파싱');

  // 5) 한국 시간 날짜 경계: UTC 15:00 = KST 다음날 00:00
  assert.strictEqual(lib.kstDate(Date.UTC(2026, 9, 6, 14, 59)), '2026-10-06');
  assert.strictEqual(lib.kstDate(Date.UTC(2026, 9, 6, 15, 0)), '2026-10-07');
  console.log('ok  KST 날짜 경계');

  // 6) 서버 로그인: 경로 키 변환이 클라이언트(storage.js)와 같아야 규칙이 맞아요
  assert.strictEqual(lib.safeSegment('a.b#c$d[e]f/g'), 'a_b_c_d_e_f_g');
  assert.strictEqual(lib.safeSegment(''), '_guest');
  assert.strictEqual(lib.safeSegment('상욱박'), '상욱박');
  assert.strictEqual(lib.normalizeNickname('  모루  '), '모루');
  assert.strictEqual(lib.normalizeNickname(''), '');
  assert.strictEqual(lib.normalizeNickname('가'.repeat(21)), '');
  assert.strictEqual(lib.normalizeNickname(123), '');
  assert.strictEqual(lib.validPin('abcd'), true);
  assert.strictEqual(lib.validPin('abc'), false);
  assert.strictEqual(lib.validPin('x'.repeat(65)), false);
  assert.strictEqual(lib.uidFor('GM'), lib.uidFor('GM'));
  assert.notStrictEqual(lib.uidFor('GM'), lib.uidFor('Gm'));
  assert.ok(/^u_[0-9a-f]{32}$/.test(lib.uidFor('상욱박')));
  console.log('ok  경로 키·닉네임·uid');

  // 7) 서버가 만든 계정 기록을 로그인 화면(WebCrypto)과 같은 방식으로 검증할 수 있는지, 그리고 그 반대도
  const rec = lib.makeAccountRecord('테스터', 'pin-1234');
  assert.strictEqual(lib.verifyPin('테스터', 'pin-1234', rec), true);
  assert.strictEqual(lib.verifyPin('테스터', 'pin-12345', rec), false);
  assert.strictEqual(rec.pinHash.length, 64);
  assert.strictEqual(rec.nickname, '테스터');
  assert.strictEqual(lib.hashPin(nickname, pin, salt, 100000), pinHash, '서버 해시 = WebCrypto 해시 (기존 계정 호환)');
  console.log('ok  계정 기록 (기존 GM·옴뇸뇸 계정과 호환)');

  // 8) 틀린 PIN 횟수 제한: 4번까지는 계속 시도, 5번째에 10분 잠금
  const t0 = 1_000_000;
  let s = null;
  for (let i = 1; i <= 4; i++) {
    s = lib.nextFailState(s, t0);
    assert.strictEqual(lib.isLocked(s, t0), false, i + '번째 실패에서는 아직 안 잠겨요');
  }
  s = lib.nextFailState(s, t0);
  assert.strictEqual(lib.isLocked(s, t0 + 1), true, '5번째 실패에서 잠겨요');
  assert.strictEqual(lib.isLocked(s, t0 + lib.LOCK_MS - 1), true);
  assert.strictEqual(lib.isLocked(s, t0 + lib.LOCK_MS + 1), false, '10분 뒤에는 풀려요');
  assert.strictEqual(lib.isLocked(null), false);
  console.log('ok  PIN 5회 실패 잠금');
  console.log('\n전부 통과');
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
