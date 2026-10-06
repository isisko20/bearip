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
  console.log('\n전부 통과');
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
