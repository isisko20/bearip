// 라이브 데이터베이스 전체를 로컬 JSON 파일로 백업해요 (Firebase 콘솔의 자동 백업과 별개로,
// 위험한 작업 전에 바로 한 번 받아두는 용도예요).
//
//   node tools/backup-db.js                  → ~/bearip-backup/ 에 날짜가 붙은 파일로 저장
//   node tools/backup-db.js D:\백업폴더        → 원하는 폴더에 저장
//   node tools/backup-db.js --instance 이름   → 기본 DB 대신 다른 인스턴스를 백업
//
// 주의: 백업 파일에는 친구들의 작품·쪽지·알림, 그리고 계정(PIN 해시)이 들어 있어요.
// 저장소(공개)에 올리거나 남에게 보내지 마세요. 기본 저장 위치는 저장소 밖이에요.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { firebase } = require('./firebase-cli');

const args = process.argv.slice(2);
const instIdx = args.indexOf('--instance');
const instance = instIdx >= 0 ? args[instIdx + 1] : null;
const skipIdx = instIdx >= 0 ? instIdx + 1 : -1; // --instance 뒤의 이름은 위치 인자가 아니에요
const positional = args.filter((a, i) => !a.startsWith('--') && i !== skipIdx);
const outDir = positional[0] || path.join(os.homedir(), 'bearip-backup');

const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16); // 2026-10-08-14-30
const file = path.join(outDir, `backup_${stamp}${instance ? '_' + instance : ''}.json`);

fs.mkdirSync(outDir, { recursive: true });
const raw = firebase(['database:get', '/'].concat(instance ? ['--instance', instance] : []));
let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error('백업 실패: 받아온 내용이 올바른 JSON이 아니에요 (로그인 상태를 확인해보세요: firebase login)');
  process.exit(1);
}
if (!data || typeof data !== 'object' || !Object.keys(data).length) {
  console.error('백업 실패: 데이터베이스가 비어 있다고 나왔어요. 저장하지 않았어요.');
  process.exit(1);
}
fs.writeFileSync(file, raw);

const sizes = Object.keys(data)
  .map((k) => [k, Buffer.byteLength(JSON.stringify(data[k]))])
  .sort((a, b) => b[1] - a[1]);
console.log('백업 완료:', file);
console.log('총 크기:', (Buffer.byteLength(raw) / 1024 / 1024).toFixed(2) + 'MB', '| 최상위 경로', sizes.length + '개');
sizes.slice(0, 8).forEach(([k, n]) => console.log('  ' + k.padEnd(20), (n / 1024).toFixed(1) + 'KB'));
