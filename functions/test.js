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

  // 9) 자동 처리 대상 가리기: 글 항목만 통과, 이미지·영상 항목은 항상 사람에게
  const textLabels = ['스토리', '시나리오', '캐릭터 설정', '세계관 구축', '초고 집필', '퇴고/ 교정', '세계관/ 설정', '포맷별 기획'];
  const visualLabels = ['캐릭터 디자인', '캐릭터/ 컨셉 디자인', '비주얼 가이드', '배경/장소', '콘티', '스토리보드', '작화', '레터링/ 검수', '표지 디자인', '촬영/제작', '편집/ 사운드', '업로드/ 연재', '현지화/ 검수', '웹툰/영상 제작', '썸네일/ 포스터'];
  textLabels.forEach((l) => assert.strictEqual(lib.isTextWork('roadmap', 'x', l), true, l + '은 자동 처리 대상'));
  visualLabels.forEach((l) => assert.strictEqual(lib.isTextWork('roadmap', 'x', l), false, l + '은 사람에게 넘겨요'));
  ['concept', 'world', 'character', 'story'].forEach((k) => assert.strictEqual(lib.isTextWork('dna', k, ''), true));
  ['visual', 'assets', 'zzz'].forEach((k) => assert.strictEqual(lib.isTextWork('dna', k, ''), false));
  console.log('ok  자동 처리 대상 가리기');

  // 10) 올린 자료에서 읽을 수 있는 글만 추리기
  const txtData = 'data:text/plain;base64,' + Buffer.from('첫째 장면: 주인공이 문을 연다.', 'utf8').toString('base64');
  const sub = lib.submissionsToText([
    { label: '1화', note: '주인공은 시간을 되돌린다' },
    { label: '설정집', fileName: 'a.txt', fileData: txtData },
    { label: '표지', fileName: 'cover.png', imageData: 'data:image/png;base64,AAAA' },
    { label: 'PDF', fileName: 'x.pdf', fileData: 'data:application/pdf;base64,AAAA' },
    null,
  ]);
  assert.ok(sub.text.includes('주인공은 시간을 되돌린다') && sub.text.includes('첫째 장면'));
  assert.ok(sub.text.includes('내용은 볼 수 없음') && !sub.text.includes('AAAA'), '이미지·PDF 원본 데이터는 프롬프트에 넣지 않아요');
  assert.strictEqual(sub.readableChars, '주인공은 시간을 되돌린다'.length + '첫째 장면: 주인공이 문을 연다.'.length);
  assert.strictEqual(lib.submissionsToText(null).text, '');
  console.log('ok  자료에서 글 추리기');

  // 11) 모델 응답 해석 — 검토
  const reviewOk = lib.parseTriageReply('review', '판정: 처리\n점수: 72\n보완필요: 예\n의견: 설정의 방향은 분명해요. 다만 주인공의 동기가 아직 약해서 첫 사건과 연결해 보완하면 좋아요.');
  assert.deepStrictEqual([reviewOk.decision, reviewOk.adminProgress, reviewOk.needsRevision], ['handle', 72, true]);
  assert.ok(reviewOk.adminComment.startsWith('설정의 방향'));
  const reviewBold = lib.parseTriageReply('review', '**판정:** 처리\n**점수:** 150\n**보완필요:** 아니오\n**의견:** 전체 흐름이 매끄럽고 인물 관계도 선명합니다. 이대로 진행해도 좋아요.');
  assert.deepStrictEqual([reviewBold.decision, reviewBold.adminProgress, reviewBold.needsRevision], ['handle', 100, false], '마크다운 굵게 표시와 범위 초과 점수 처리');
  assert.strictEqual(lib.parseTriageReply('review', '판정: 인계\n사유: 이미지 품질 판단이 필요해요').decision, 'handoff');
  assert.strictEqual(lib.parseTriageReply('review', '판정: 인계\n사유: 이미지 품질 판단이 필요해요').reason, '이미지 품질 판단이 필요해요');
  assert.strictEqual(lib.parseTriageReply('review', '그냥 잘 썼어요').decision, 'handoff', '형식이 없으면 사람에게');
  assert.strictEqual(lib.parseTriageReply('review', '판정: 처리\n점수: 80').decision, 'handoff', '의견이 없으면 사람에게');
  assert.strictEqual(lib.parseTriageReply('review', '').decision, 'handoff');
  console.log('ok  검토 응답 해석');

  // 12) 모델 응답 해석 — 글 초안
  const draft = '판정: 처리\n요약: 1화 시놉시스 초안\n결과:\n1. 도입\n' + '주인공이 낡은 시계탑에서 눈을 뜬다. '.repeat(6);
  const prodOk = lib.parseTriageReply('production', draft);
  assert.strictEqual(prodOk.decision, 'handle');
  assert.strictEqual(prodOk.resultNote, '1화 시놉시스 초안');
  assert.ok(prodOk.resultText.startsWith('1. 도입') && prodOk.resultText.includes('\n') === true);
  assert.strictEqual(lib.parseTriageReply('production', '판정: 처리\n결과: 너무 짧음').decision, 'handoff');
  assert.strictEqual(lib.parseTriageReply('production', '판정: 인계\n사유: 그림이 필요해요').decision, 'handoff');
  assert.strictEqual(lib.parseTriageReply('production', '판정: 처리\n요약: x\n결과:\n' + 'A'.repeat(9000)).resultText.length, 3500);
  console.log('ok  초안 응답 해석');

  // 13) 프롬프트에 사용자 입력이 구역별로 들어가고, 시스템 프롬프트가 정체를 숨기라고 지시하는지
  const tsys = lib.buildTriageSystemPrompt('매뉴얼 XYZ');
  assert.ok(tsys.includes('매뉴얼 XYZ') && tsys.includes('판정: 인계') && tsys.includes('사람인지 AI인지'));
  const rp = lib.buildReviewPrompt(lib.sanitizeIp({ title: '내 작품' }), '시나리오', '봐주세요', '(1) 1화\n내용');
  assert.ok(rp.includes('제목: 내 작품') && rp.includes('[의뢰 내용]\n봐주세요') && rp.includes('(1) 1화'));
  const pp = lib.buildProductionPrompt(lib.sanitizeIp({ title: '내 작품' }), '세계관 구축', '', '이전 결과 본문', true);
  assert.ok(pp.includes('이전 결과 수정·보완') && pp.includes('[이전에 전달한 결과]\n이전 결과 본문') && pp.includes('따로 적은 내용 없음'));
  console.log('ok  프롬프트 구성 (의뢰)');

  // 14) 자료 분석 대상 종류: 글 항목(시나리오·캐릭터 설정·세계관)만
  const cat = lib.checklistCategory;
  ['스토리', '시나리오', '스토리 설계'].forEach((l) => assert.strictEqual(cat(l), 'story', l));
  ['캐릭터 설정'].forEach((l) => assert.strictEqual(cat(l), 'character', l));
  ['세계관 구축', '세계관/ 설정'].forEach((l) => assert.strictEqual(cat(l), 'world', l));
  ['캐릭터 디자인', '캐릭터/ 컨셉 디자인', '비주얼 가이드', '톤앤매너/ 비주얼 가이드', '스토리보드', '콘티', '초고 집필', '퇴고/ 교정', '포맷별 기획', '배경/장소', '작화', '', null].forEach((l) => assert.strictEqual(cat(l), null, String(l)));
  Object.keys(lib.CHECKLISTS).forEach((k) => assert.ok(lib.CHECKLISTS[k].items.length >= 7));
  console.log('ok  분석 대상 종류와 필수 요소 목록');

  // 15) 필수 요소 점검 응답 해석
  const storyNames = lib.CHECKLISTS.story.items.map(([name]) => name);
  const sec = (n, yes) => `[자료 ${n}]\n` + storyNames.map((name, i) => `${name}: ${yes.includes(i) ? '있음' : '없음'}`).join('\n');
  const parsed = lib.parseCheckReply('story', 3, sec(1, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) + '\n\n' + sec(2, [1, 2]) + '\n[자료 3]\n주인공: 있음');
  assert.strictEqual(parsed[0].covered.length, 10);
  assert.strictEqual(parsed[0].missing.length, 0);
  assert.deepStrictEqual(parsed[1].covered, ['주인공', '시작 사건']);
  assert.strictEqual(parsed[1].missing.length, 8);
  assert.strictEqual(parsed[2], null, '절반도 읽지 못한 자료는 분석 실패(null)');
  const longText = '첫 문장입니다. '.repeat(100);
  const clipped = lib.clipToSentence(longText, 100);
  assert.ok(clipped.length <= 100 && clipped.endsWith('.'), '길이 제한에 걸리면 문장 끝까지만 남겨요: ' + clipped.slice(-10));
  assert.strictEqual(lib.clipToSentence('짧아요', 100), '짧아요');
  assert.strictEqual(lib.clipToSentence('마침표 없는 아주 긴 글'.repeat(20), 50).length, 50);
  const bold = lib.parseCheckReply('story', 1, '**[자료 1]**\n' + storyNames.map((n) => `**${n}:** 있음`).join('\n'));
  assert.strictEqual(bold[0].covered.length, 10, '굵게 표시가 섞여도 읽어요');
  assert.deepStrictEqual(lib.parseCheckReply('story', 2, '엉뚱한 답변'), [null, null]);
  assert.deepStrictEqual(lib.parseCheckReply('story', 1, '[자료 9]\n주인공: 있음'), [null], '범위 밖 자료 번호는 무시');
  console.log('ok  필수 요소 점검 응답 해석');

  // 16) 점검·점수 프롬프트와 점수 해석
  const cp = lib.buildCheckPrompt('character', '캐릭터 설정', [{ label: '하린', text: '하린은 시계방 주인이다' }, { label: '', text: 'x'.repeat(5000) }]);
  assert.ok(cp.includes('[필수 요소]') && cp.includes('- 약점:') && cp.includes('[자료 1] 하린') && cp.includes('[자료 2] 제목 없음'));
  assert.ok(cp.length < 4500, '자료 본문은 길이를 잘라서 넣어요');
  const csys = lib.buildCheckSystemPrompt();
  assert.ok(csys.includes('조언하지 마세요') && csys.includes('사람인지 AI인지'));
  assert.strictEqual(lib.parseScoreReply('점수: 73'), 73);
  assert.strictEqual(lib.parseScoreReply('**점수:** 180'), 100);
  assert.strictEqual(lib.parseScoreReply('잘 모르겠어요'), null);
  const ssys = lib.buildScoreSystemPrompt('매뉴얼 Q');
  assert.ok(ssys.includes('매뉴얼 Q') && ssys.includes('점수: 정수'));
  assert.ok(lib.buildScorePrompt('story', lib.sanitizeIp({ title: '내 작품' }), '스토리', '본문').includes('제목: 내 작품'));
  console.log('ok  점검·점수 프롬프트와 점수 해석');
  console.log('\n전부 통과');
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
