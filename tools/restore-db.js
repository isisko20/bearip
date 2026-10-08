// 백업 파일의 "한 경로"를 데이터베이스에 되돌려요. 실수로 전체를 덮어쓰지 않게, 기본은 확인만
// 보여주고(드라이런) --yes를 붙여야 실제로 써요.
//
//   node tools/restore-db.js 백업파일.json /publicIPs            → 무엇이 바뀔지 확인만
//   node tools/restore-db.js 백업파일.json /publicIPs --yes      → 실제로 복구
//   node tools/restore-db.js 백업파일.json /ipDetails/ip_123 --yes   → 특정 IP 하나만 복구
//   (--instance 이름 으로 다른 인스턴스에 복구해 연습해볼 수 있어요)
//
// 경로는 그 자리의 내용을 통째로 교체해요. 복구 직전의 상태는 자동으로 같은 폴더에
// before_restore_*.json 으로 저장하니, 잘못 복구해도 되돌릴 수 있어요.
// "/" 전체 복구는 --all 도 함께 줘야 해요 (친구들의 최근 작업이 모두 사라질 수 있어요).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { firebase } = require('./firebase-cli');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const instIdx = args.indexOf('--instance');
const instance = instIdx >= 0 ? args[instIdx + 1] : null;
const skipIdx = instIdx >= 0 ? instIdx + 1 : -1; // --instance 뒤의 이름은 위치 인자가 아니에요
const positional = args.filter((a, i) => !a.startsWith('--') && i !== skipIdx);
const [backupFile, dbPath] = positional;

if (!backupFile || !dbPath || !dbPath.startsWith('/')) {
  console.error('사용법: node tools/restore-db.js <백업파일.json> </경로> [--yes] [--instance 이름]');
  process.exit(1);
}
if (dbPath === '/' && !flag('--all')) {
  console.error('전체("/") 복구는 --all 을 함께 줘야 해요. 정말 필요한 경우가 아니면 경로를 좁혀서 복구하세요.');
  process.exit(1);
}

const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
const parts = dbPath.split('/').filter(Boolean);
const subtree = parts.reduce((node, key) => (node && typeof node === 'object' ? node[key] : undefined), backup);
if (subtree === undefined || subtree === null) {
  console.error(`백업 파일에 ${dbPath} 가 없어요. (복구하면 이 경로가 비워질 수 있어서 중단했어요)`);
  process.exit(1);
}

const instArgs = instance ? ['--instance', instance] : [];
const sizeOf = (v) => Buffer.byteLength(JSON.stringify(v === null || v === undefined ? null : v));
const currentRaw = firebase(['database:get', dbPath].concat(instArgs));
let current = null;
try {
  current = JSON.parse(currentRaw);
} catch (e) {
  /* 지금 비어 있으면 null */
}
const count = (v) => (v && typeof v === 'object' ? Object.keys(v).length : v === null ? 0 : 1);
console.log(`복구 대상: ${dbPath}${instance ? ' (인스턴스 ' + instance + ')' : ''}`);
console.log(`  지금      : 항목 ${count(current)}개, ${(sizeOf(current) / 1024).toFixed(1)}KB`);
console.log(`  백업 내용 : 항목 ${count(subtree)}개, ${(sizeOf(subtree) / 1024).toFixed(1)}KB`);

if (!flag('--yes')) {
  console.log('\n확인만 했어요. 실제로 복구하려면 같은 명령 끝에 --yes 를 붙이세요.');
  process.exit(0);
}

// 복구 직전 상태 저장 (되돌릴 수 있게)
const safeName = dbPath.replace(/\//g, '_') || '_all';
const beforeFile = path.join(path.dirname(path.resolve(backupFile)), `before_restore_${new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16)}${safeName}.json`);
fs.writeFileSync(beforeFile, currentRaw && currentRaw.trim() ? currentRaw : 'null');
console.log('복구 직전 상태 저장:', beforeFile);

const tmp = path.join(os.tmpdir(), `restore_${Date.now()}.json`);
fs.writeFileSync(tmp, JSON.stringify(subtree));
try {
  firebase(['database:set', dbPath, tmp, '--force'].concat(instArgs));
} finally {
  fs.unlinkSync(tmp);
}
console.log('복구 완료:', dbPath);
