// 앱 아이콘(PNG)을 만들어요: 로그인 화면 로고와 같은 "보라→파랑 그라데이션 위의 흰색 T".
//   node tools/make-icons.js   → assets/icons/ 에 icon-192.png, icon-512.png, apple-touch-icon.png 저장
// 외부 라이브러리 없이 Node 기본 기능(zlib)만 써요. T는 가운데 62% 안에 들어가서, 안드로이드가
// 아이콘을 원형/둥근 사각형으로 잘라도(마스크) 잘리지 않아요.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PURPLE = [0x6a, 0x3f, 0xd6];
const BLUE = [0x1e, 0x6f, 0xd9];

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = Array.from({ length: 256 }, (_, n) => {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  }));
  c = 0xffffffff;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

// 점 (px,py)에서 선분 (ax,ay)-(bx,by)까지의 거리
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function renderIcon(size, glyphScale) {
  // 로고 viewBox(24) 기준 T: "M5 6h14M12 6v13", 선 두께 2.6
  const unit = (size * glyphScale) / 24;
  const ox = size / 2 - 12 * unit;
  const oy = size / 2 - 12.5 * unit; // 글리프 세로 중심(6~19 → 12.5)이 아이콘 중앙에 오도록
  const r = (2.6 * unit) / 2;
  const segs = [
    [ox + 5 * unit, oy + 6 * unit, ox + 19 * unit, oy + 6 * unit],
    [ox + 12 * unit, oy + 6 * unit, ox + 12 * unit, oy + 19 * unit],
  ];
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // 필터 없음
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (2 * (size - 1)); // 대각선 그라데이션
      const px = x + 0.5, py = y + 0.5;
      const d = Math.min(...segs.map((s) => distToSegment(px, py, ...s)));
      const alpha = Math.max(0, Math.min(1, r - d + 0.5)); // 1픽셀 안티앨리어싱
      for (let ch = 0; ch < 3; ch++) {
        const bg = PURPLE[ch] + (BLUE[ch] - PURPLE[ch]) * t;
        raw[y * stride + 1 + x * 3 + ch] = Math.round(bg + (255 - bg) * alpha);
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 비트 깊이
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, '..', 'assets', 'icons');
fs.mkdirSync(outDir, { recursive: true });
for (const [name, size] of [['icon-192', 192], ['icon-512', 512], ['apple-touch-icon', 180]]) {
  const file = path.join(outDir, name + '.png');
  fs.writeFileSync(file, renderIcon(size, 0.62));
  console.log(name + '.png', size + 'px', (fs.statSync(file).size / 1024).toFixed(1) + 'KB');
}
