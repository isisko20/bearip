// 소유자 전용 쓰기 규칙(database.rules.next.json)을 켜도 되는 상태인지 점검해요 — 읽기만 하고
// 아무것도 바꾸지 않아요.
//
//   node tools/check-activation.js
//
// 확인하는 것:
//   1. 작품 주인·공개 작성자 모두 PIN 계정이 있는지 (없으면 켠 뒤 자기 작품을 저장할 수 없어요)
//   2. 주인 기록이 없는 IP가 없는지 (있으면 GM만 고칠 수 있게 돼요)
//   3. database.rules.next.json이 현재 규칙에서 만든 것과 같은지 (규칙을 고친 뒤 다시 안 만들었으면 어긋나요)
//   4. 켜기 직전에 받은 백업이 있는지 (1시간 안)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { firebase } = require('./firebase-cli');

const safeSegment = (s) => String(s || '').replace(/[.#$[\]/]/g, '_') || '_guest';
const read = (p, shallow) => {
  const out = firebase(['database:get', p].concat(shallow ? ['--shallow'] : []));
  return JSON.parse(out || 'null') || {};
};

const results = [];
const add = (ok, title, detail) => results.push({ ok, title, detail });

const accounts = read('/accounts', true);
const ips = read('/allIPs');
const creators = read('/publicCreators', true);

// 1) PIN
const owners = {};
const ownerless = [];
Object.keys(ips).forEach((id) => {
  const owner = ips[id] && ips[id].ownerNickname;
  if (owner) owners[owner] = (owners[owner] || 0) + 1;
  else ownerless.push(`${id} (${(ips[id] && ips[id].title) || '제목 없음'})`);
});
Object.keys(creators).forEach((name) => (owners[name] = owners[name] || 0));
const noPin = Object.keys(owners).filter((name) => !accounts[safeSegment(name)]);
add(
  !noPin.length,
  'PIN 설정',
  noPin.length
    ? `PIN이 없는 분: ${noPin.map((n) => `${n}(IP ${owners[n]}개)`).join(', ')} → GM 화면 "계정 PIN 현황"에서 알림을 보내세요`
    : `작품 주인 ${Object.keys(owners).length}명 모두 PIN이 있어요`
);

// 2) 주인 없는 IP
add(!ownerless.length, '주인 없는 IP', ownerless.length ? `${ownerless.join(', ')} → GM 화면에서 주인을 지정하세요` : '없어요');

// 3) 규칙 파일 동기화
const root = path.join(__dirname, '..');
const tmp = path.join(os.tmpdir(), 'rules.next.check.json');
const gen = spawnSync(process.execPath, [path.join(__dirname, 'gen-ownership-rules.js'), path.join(root, 'database.rules.json'), tmp, 'GM'], { encoding: 'utf8' });
if (gen.status !== 0) {
  add(false, '규칙 파일', '소유자 전용 규칙을 만들지 못했어요: ' + (gen.stderr || '').trim());
} else {
  const same = JSON.stringify(JSON.parse(fs.readFileSync(tmp, 'utf8'))) === JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, 'database.rules.next.json'), 'utf8')));
  add(same, '규칙 파일', same ? 'database.rules.next.json이 현재 규칙과 맞아요' : 'database.rules.next.json이 오래됐어요 → node tools/gen-ownership-rules.js database.rules.json database.rules.next.json GM');
}

// 4) 백업
const backupDir = path.join(os.homedir(), 'bearip-backup');
let newest = 0;
try {
  fs.readdirSync(backupDir).forEach((f) => {
    if (/^backup_.*\.json$/.test(f)) newest = Math.max(newest, fs.statSync(path.join(backupDir, f)).mtimeMs);
  });
} catch (e) {
  /* 폴더가 없으면 백업 없음 */
}
const ageMin = newest ? Math.round((Date.now() - newest) / 60000) : null;
add(ageMin !== null && ageMin <= 60, '직전 백업', ageMin === null ? '백업이 없어요 → node tools/backup-db.js' : ageMin <= 60 ? `${ageMin}분 전 백업이 있어요` : `마지막 백업이 ${ageMin}분 전이에요 → 켜기 직전에 node tools/backup-db.js 로 새로 받으세요`);

console.log('');
results.forEach((r) => console.log(`${r.ok ? '✅' : '❌'} ${r.title}: ${r.detail}`));
const ready = results.every((r) => r.ok);
console.log('');
if (ready) {
  console.log('모두 준비됐어요. 켜는 순서:');
  console.log('  1) copy database.rules.next.json database.rules.json   (맥/리눅스는 cp)');
  console.log('  2) firebase deploy --only database --dry-run            (먼저 문법 확인)');
  console.log('  3) firebase deploy --only database');
  console.log('문제가 생기면 git으로 이전 database.rules.json을 되돌려 다시 배포하면 바로 원래대로 돌아와요.');
} else {
  console.log('아직 켜면 안 돼요. 위 ❌ 항목을 해결한 뒤 다시 실행하세요.');
}
process.exit(ready ? 0 : 1);
