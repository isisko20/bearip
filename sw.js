// Thinkit 서비스 워커 — 앱으로 설치할 수 있게 하고, 인터넷이 끊겼을 때 안내 페이지를 보여줘요.
//
// 일부러 "항상 네트워크 먼저"로 만들었어요. 서비스 워커가 페이지나 스크립트를 캐시에서 먼저
// 내주면, 새로 배포해도 옛 코드가 계속 떠서 친구들이 고쳐진 기능을 못 쓰게 돼요. 그래서
//  · 페이지 이동: 항상 서버에서 받고, 연결이 안 될 때만 안내 페이지(offline.html)
//  · 같은 사이트의 정적 파일: 서버에서 받고(성공하면 사본 저장), 연결이 안 될 때만 사본 사용
//  · Firebase·서버 함수·외부 CDN 같은 다른 주소의 요청은 아예 건드리지 않아요
// 코드를 크게 바꿨을 때 옛 사본이 남지 않게 하려면 아래 VERSION을 올려요.
const VERSION = 'v1';
const CACHE = 'thinkit-' + VERSION;
const OFFLINE_URL = 'offline.html';

// 서버가 offline.html을 다른 주소로 리다이렉트해서 내주는 경우(예: .html을 떼는 서버)가 있는데,
// 리다이렉트를 거친 응답은 브라우저가 "페이지 이동"의 응답으로 쓰지 못하고 오류로 처리해요.
// 그래서 내용만 꺼내 리다이렉트 표시가 없는 새 응답으로 저장해둬요.
function cleanCopy(res) {
  return res.blob().then((body) => new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.all([
          fetch(OFFLINE_URL).then((res) => (res.ok ? cleanCopy(res).then((copy) => cache.put(OFFLINE_URL, copy)) : undefined)),
          cache.add('assets/icons/icon-192.png'),
        ])
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('thinkit-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
