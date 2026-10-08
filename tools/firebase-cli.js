// firebase CLI를 부르는 공용 함수. PATH에 firebase가 있으면 그걸 쓰고, 없으면(예: PowerShell이
// 전역 설치를 못 찾을 때) npx.cmd/npx로 firebase-tools를 대신 실행해요.
const { spawnSync } = require('child_process');

const PROJECT = process.env.FIREBASE_PROJECT || 'thinkit-ccb2e';

// Windows의 .cmd 실행에는 shell이 필요한데, shell을 쓰면 인자가 그대로 이어붙여져서 공백이 있는
// 경로가 깨져요 — 공백이 든 인자는 따옴표로 감싸요.
function tryRun(cmd, args) {
  const win = process.platform === 'win32';
  const safe = win ? args.map((a) => (/[\s&|<>^]/.test(a) ? `"${a}"` : a)) : args;
  return spawnSync(cmd, safe, { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, shell: win });
}

function firebase(args) {
  const full = args.concat(['--project', PROJECT]);
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const candidates = [
    ['firebase', full],
    [npx, ['--yes', 'firebase-tools'].concat(full)],
  ];
  let last;
  for (const [cmd, a] of candidates) {
    const r = tryRun(cmd, a);
    last = r;
    const missing = r.error || /not recognized|command not found|ENOENT|인식되지/i.test(r.stderr || '');
    if (!missing && r.status === 0) return r.stdout;
    if (!missing) {
      console.error((r.stderr || r.stdout || '').trim());
      process.exit(r.status || 1);
    }
  }
  console.error('firebase CLI를 찾지 못했어요:', last && (last.stderr || (last.error && last.error.message)));
  process.exit(1);
}

module.exports = { firebase, PROJECT };
