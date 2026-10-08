// 모든 페이지가 로드하는 공통 스크립트 — 앱 설치(PWA)와 오류 자동 수집.
// storage.js 다음에 로드돼서 bearipGetUser, _bearipWhenFirebaseAuthed 같은 함수를 필요할 때 가져다 써요
// (없으면 조용히 건너뛰어요 — 이 파일이 다른 기능을 깨뜨리면 안 되니까요).
(function () {
  'use strict';

  const isStandalone = () =>
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  const clip = (v, n) => String(v == null ? '' : v).slice(0, n);

  // ================= 서비스 워커 (앱 설치의 바탕) =================
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {
        /* 등록에 실패해도 사이트는 그대로 쓸 수 있어요 */
      });
    });
  }

  // ================= 오류 자동 수집 =================
  // 화면에서 난 자바스크립트 오류와 불러오지 못한 스크립트를 Firebase(clientErrors)에 모아서, 친구들이
  // 말해주지 않아도 어디서 막혔는지 GM 화면(제작요청 관리)이나 CLI로 볼 수 있게 해요.
  // 모으는 것: 오류 문구·파일·줄 번호·스택(주소의 쿼리 제외)·페이지 경로·닉네임·브라우저 종류.
  // 모으지 않는 것: 입력한 글, 쪽지·댓글 내용, 이미지, PIN 같은 데이터.
  // 같은 오류는 이 브라우저에서 1시간에 한 번만, 한 페이지에서는 최대 8건까지만 보내요.
  const MAX_PER_PAGE = 8;
  const SEEN_KEY = 'bearip_err_seen';
  const SEEN_TTL_MS = 60 * 60 * 1000;
  let sentThisPage = 0;

  const stripOrigin = (s) => String(s || '').split(location.origin).join('').replace(/\?[^\s:)]*/g, '');

  function ignorable(message, source) {
    if (!message) return true;
    if (/^script error\.?$/i.test(message)) return true; // 다른 주소의 스크립트 오류는 내용을 알 수 없어요
    if (/ResizeObserver loop/i.test(message)) return true; // 브라우저가 흔히 내는 무해한 경고
    if (/extension:\/\//.test(source || '') || /extension:\/\//.test(message)) return true; // 브라우저 확장 프로그램
    return false;
  }

  function signature(kind, message, source, line) {
    const s = [kind, clip(message, 120), source, line].join('|');
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  function alreadySeen(sig) {
    let map = {};
    try {
      map = JSON.parse(localStorage.getItem(SEEN_KEY)) || {};
    } catch (e) {
      map = {};
    }
    const now = Date.now();
    Object.keys(map).forEach((k) => {
      if (now - map[k] > SEEN_TTL_MS) delete map[k];
    });
    const seen = !!map[sig] && now - map[sig] < SEEN_TTL_MS;
    if (!seen) {
      map[sig] = now;
      const keys = Object.keys(map);
      if (keys.length > 60) delete map[keys[0]];
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(map));
      } catch (e) {
        /* 저장이 막혀 있어도 보고 자체는 계속해요 */
      }
    }
    return seen;
  }

  function send(payload) {
    if (sentThisPage >= MAX_PER_PAGE) return;
    sentThisPage++;
    try {
      if (typeof _bearipWhenFirebaseAuthed !== 'function' || typeof firebase === 'undefined') return;
      _bearipWhenFirebaseAuthed()
        .then(() => firebase.database().ref('clientErrors/' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)).set(payload))
        .catch(() => {
          /* 오류 보고 자체가 실패해도 또 다른 오류를 만들지 않아요 */
        });
    } catch (e) {
      /* 보고하다 난 오류는 삼켜요 */
    }
  }

  function report(kind, message, source, line, col, stack, code) {
    try {
      message = clip(message, 300);
      source = clip(stripOrigin(source), 180);
      if (ignorable(message, source)) return;
      if (alreadySeen(signature(kind, message, source, line))) return;
      const user = typeof bearipGetUser === 'function' ? bearipGetUser() : null;
      const payload = {
        kind,
        message,
        page: clip(location.pathname, 90),
        createdAt: new Date().toISOString(),
        ua: clip(navigator.userAgent, 190),
        standalone: isStandalone(),
      };
      if (source) payload.source = source;
      if (Number.isFinite(line)) payload.line = line;
      if (Number.isFinite(col)) payload.col = col;
      if (stack) payload.stack = clip(stripOrigin(stack), 1100);
      if (code) payload.code = clip(code, 50);
      if (user && user.nickname) payload.nickname = clip(user.nickname, 38);
      send(payload);
    } catch (e) {
      /* 보고하다 난 오류는 삼켜요 */
    }
  }

  // 세 번째 인자 true(캡처 단계) — 스크립트·스타일 파일이 로드되지 않은 오류는 이 단계에서만 잡혀요.
  window.addEventListener(
    'error',
    (e) => {
      const target = e.target;
      if (target && target !== window && target.tagName) {
        const tag = target.tagName;
        if (tag === 'SCRIPT' || (tag === 'LINK' && target.rel === 'stylesheet')) {
          report('resource', '불러오지 못한 파일 (' + tag.toLowerCase() + ')', target.src || target.href, 0, 0, '');
        }
        return; // 이미지 등 나머지 파일 실패는 흔해서 모으지 않아요
      }
      report('error', e.message, e.filename, e.lineno, e.colno, e.error && e.error.stack);
    },
    true
  );

  // 처리되지 않은 Promise 오류. 권한이 없어서 저장이 거절된 것(PERMISSION_DENIED)은 따로 표시해서,
  // 규칙을 바꾼 뒤 "막힌 저장"이 어디서 나는지 한눈에 볼 수 있게 해요.
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    const code = reason && reason.code;
    report(code === 'PERMISSION_DENIED' ? 'denied' : 'rejection', (reason && reason.message) || String(reason), '', 0, 0, reason && reason.stack, code);
  });

  // ================= 앱 설치 안내 =================
  // 로그인한 사람에게만, 앱으로 열려 있지 않을 때만, 닫으면 14일 동안 다시 안 보여줘요.
  //  · 안드로이드/PC 크롬: 설치 버튼 (beforeinstallprompt)
  //  · 아이폰 사파리: "공유 → 홈 화면에 추가" 안내 (아이폰은 설치 버튼을 쓸 수 없어요)
  //  · 카카오톡 안에서 연 경우: 설치가 안 되니 다른 브라우저로 열라고 안내
  const DISMISS_KEY = 'bearip_pwa_dismissed_at';
  const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isKakao = /KAKAOTALK/i.test(ua);
  let deferredPrompt = null;

  function dismissedRecently() {
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY));
      return !!at && Date.now() - at < DISMISS_MS;
    } catch (e) {
      return false;
    }
  }
  function rememberDismissed() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch (e) {
      /* best-effort */
    }
  }
  function removeBanner() {
    const el = document.getElementById('bearipPwaBanner');
    if (el) el.remove();
  }

  function eligible() {
    if (isStandalone() || dismissedRecently()) return false;
    const page = location.pathname.split('/').pop().replace(/\.html$/, '');
    if (['', 'index', 'login', 'offline'].includes(page)) return false; // 소개·로그인 화면에서는 방해하지 않아요
    const user = typeof bearipGetUser === 'function' ? bearipGetUser() : null;
    if (!user) return false;
    if (document.getElementById('bearipAccountOverlay')) return false; // 본인 확인 창이 떠 있으면 겹치지 않게
    return true;
  }

  function injectBannerStyles() {
    if (document.getElementById('bearip-pwa-style')) return;
    const style = document.createElement('style');
    style.id = 'bearip-pwa-style';
    style.textContent = `
      .bearip-pwa-banner {
        position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 1090;
        width: calc(100% - 32px); max-width: 420px; box-sizing: border-box; padding: 14px 16px; border-radius: 16px;
        background: var(--dr-panel, var(--od-panel, var(--cr-bg-elev, var(--panel, #ffffff))));
        color: var(--dr-ink, var(--od-ink, var(--cr-ink, var(--ink, #201d33))));
        border: 1px solid var(--dr-border, var(--od-border, var(--cr-border, var(--line, #e5e2f0))));
        box-shadow: 0 12px 36px rgba(20, 16, 42, 0.28); font-family: 'Noto Sans KR', sans-serif;
        display: flex; align-items: center; gap: 12px;
      }
      .bearip-pwa-banner .pwa-icon { width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0; }
      .bearip-pwa-banner .pwa-text { flex: 1; min-width: 0; }
      .bearip-pwa-banner .pwa-title { font-size: 13px; font-weight: 800; }
      .bearip-pwa-banner .pwa-sub { font-size: 11.5px; line-height: 1.5; margin-top: 2px; opacity: 0.7; }
      .bearip-pwa-banner .pwa-actions { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
      .bearip-pwa-banner button { padding: 7px 14px; border-radius: 999px; font: inherit; font-size: 12px; font-weight: 800; cursor: pointer; border: 1px solid transparent; }
      .bearip-pwa-banner .pwa-install { background: var(--dr-purple, var(--od-purple, var(--cr-purple, #6a3fd6))); color: #fff; }
      .bearip-pwa-banner .pwa-later { background: transparent; color: inherit; opacity: 0.65; }
    `;
    document.head.appendChild(style);
  }

  function showBanner() {
    if (document.getElementById('bearipPwaBanner') || !eligible()) return;
    let kind = null;
    if (deferredPrompt) kind = 'prompt';
    else if (isKakao) kind = 'inapp';
    else if (isIos) kind = 'ios';
    if (!kind) return;

    const copy = {
      prompt: ['Thinkit을 앱처럼 설치할 수 있어요', '홈 화면에서 바로 열어서 쪽지와 알림을 더 빨리 확인해요.'],
      ios: ['홈 화면에 추가하면 앱처럼 쓸 수 있어요', 'Safari 아래쪽의 공유 버튼(네모에 위 화살표)을 누르고 "홈 화면에 추가"를 선택하세요.'],
      inapp: ['다른 브라우저로 열면 앱으로 설치할 수 있어요', '카카오톡 안에서는 설치할 수 없어요. Safari나 Chrome으로 열어주세요.'],
    }[kind];

    injectBannerStyles();
    const banner = document.createElement('div');
    banner.id = 'bearipPwaBanner';
    banner.className = 'bearip-pwa-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', '앱 설치 안내');
    banner.innerHTML = `
      <img class="pwa-icon" src="assets/icons/icon-192.png" alt="">
      <div class="pwa-text"><div class="pwa-title"></div><div class="pwa-sub"></div></div>
      <div class="pwa-actions">
        ${kind === 'prompt' ? '<button type="button" class="pwa-install">설치</button>' : ''}
        <button type="button" class="pwa-later">${kind === 'prompt' ? '나중에' : '닫기'}</button>
      </div>`;
    banner.querySelector('.pwa-title').textContent = copy[0];
    banner.querySelector('.pwa-sub').textContent = copy[1];
    banner.querySelector('.pwa-later').addEventListener('click', () => {
      rememberDismissed();
      removeBanner();
    });
    const installBtn = banner.querySelector('.pwa-install');
    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice.catch(() => ({ outcome: 'dismissed' }));
        deferredPrompt = null;
        removeBanner();
        if (choice.outcome !== 'accepted') rememberDismissed();
      });
    }
    document.body.appendChild(banner);
  }

  function scheduleBanner() {
    setTimeout(showBanner, 4000); // 페이지가 자리 잡힌 뒤에 보여줘요
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    scheduleBanner();
  });
  window.addEventListener('appinstalled', () => {
    rememberDismissed();
    removeBanner();
  });
  // 아이폰·카카오톡 안에서는 beforeinstallprompt가 오지 않아서 페이지 로드 때 직접 확인해요.
  if (isIos || isKakao) window.addEventListener('load', scheduleBanner);
})();
