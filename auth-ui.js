// Wires the profile chip / avatar button in every page's header:
// - shows the real nickname when signed in
// - clicking it opens a small popover with a summary + quick actions,
//   instead of navigating away immediately
// - the bell icon still jumps straight to notifications.html
// Also injects the popover's CSS once, using a var() fallback chain so it
// picks up whichever theme tokens (--dr-*, --od-*, --cr-*) the host page
// defines, without needing a stylesheet link added to every page.

function bearipEscapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function bearipInjectProfileMenuStyles() {
  if (document.getElementById('bearip-pm-style')) return;
  const style = document.createElement('style');
  style.id = 'bearip-pm-style';
  style.textContent = `
    .bearip-pm {
      --pm-panel: var(--dr-panel, var(--od-panel, var(--cr-bg-elev, var(--panel, #ffffff))));
      --pm-border: var(--dr-border, var(--od-border, var(--cr-border, var(--line, #e5e2f0))));
      --pm-ink: var(--dr-ink, var(--od-ink, var(--cr-ink, var(--ink, #201d33))));
      --pm-ink-soft: var(--dr-ink-soft, var(--od-ink-soft, var(--cr-ink-soft, var(--ink-soft, #8b879c))));
      --pm-purple: var(--dr-purple, var(--od-purple, var(--cr-purple, var(--purple-1, #6d4de6))));
      --pm-purple-2: var(--dr-purple-2, var(--od-purple-2, var(--purple-2, #8f6bff)));
      --pm-active-bg: var(--dr-active-bg, var(--od-active-bg, rgba(139,107,255,0.16)));
      --pm-shadow: var(--dr-shadow, var(--od-shadow, var(--cr-shadow, var(--shadow-soft, 0 20px 50px rgba(0,0,0,0.35)))));
      position: fixed; z-index: 999; width: 264px;
      background: var(--pm-panel); border: 1px solid var(--pm-border); border-radius: 16px;
      box-shadow: var(--pm-shadow); padding: 14px;
      opacity: 0; pointer-events: none; transform: translateY(-6px);
      transition: opacity .15s ease, transform .15s ease;
      font-family: 'Noto Sans KR', sans-serif; color: var(--pm-ink);
    }
    .bearip-pm.show { opacity: 1; pointer-events: auto; transform: translateY(0); }
    .bearip-pm-header { display: flex; align-items: center; gap: 10px; padding: 2px 2px 12px; }
    .bearip-pm-avatar {
      width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(150deg, var(--pm-purple), var(--pm-purple-2));
      color: #fff; font-size: 15px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
    }
    .bearip-pm-info { min-width: 0; }
    .bearip-pm-name { font-size: 13.5px; font-weight: 800; }
    .bearip-pm-bio { font-size: 11.5px; color: var(--pm-ink-soft); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bearip-pm-divider { height: 1px; background: var(--pm-border); margin: 2px 0 10px; }
    .bearip-pm-btn {
      display: block; width: 100%; text-align: left; padding: 10px 10px; margin-bottom: 4px;
      border: none; border-radius: 10px; background: none; color: var(--pm-ink);
      font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit;
    }
    .bearip-pm-btn:last-child { margin-bottom: 0; }
    .bearip-pm-btn:hover { background: var(--pm-active-bg); }
    .bearip-pm-btn.primary { background: var(--pm-active-bg); color: var(--pm-purple); }
    .bearip-pm-btn.primary:hover { background: var(--pm-active-bg); filter: brightness(0.96); }
    .bearip-pm-btn.danger:hover { color: #e0455b; background: rgba(224,69,91,0.1); }
    .bearip-pm-guest-t { font-size: 13px; font-weight: 800; padding: 2px 2px 4px; }
    .bearip-pm-guest-s { font-size: 11.5px; color: var(--pm-ink-soft); padding: 0 2px 12px; line-height: 1.5; }

    .bearip-pm-switch-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 10px; margin-bottom: 4px; font-size: 12.5px; font-weight: 700; color: var(--pm-ink);
    }
    .bearip-pm-switch {
      position: relative; width: 38px; height: 22px; flex-shrink: 0;
      border: none; border-radius: 999px; background: var(--pm-border);
      padding: 0; cursor: pointer; transition: background 0.18s ease;
    }
    .bearip-pm-switch .knob {
      position: absolute; top: 2px; left: 2px; width: 18px; height: 18px;
      border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.25);
      transition: transform 0.18s ease;
    }
    .bearip-pm-switch.on { background: var(--pm-purple); }
    .bearip-pm-switch.on .knob { transform: translateX(16px); }

    .bearip-toast {
      --pm-purple: var(--dr-purple, var(--od-purple, var(--cr-purple, var(--purple-1, #6d4de6))));
      --pm-shadow: var(--dr-shadow, var(--od-shadow, var(--cr-shadow, var(--shadow-soft, 0 20px 50px rgba(0,0,0,0.35)))));
      position: fixed; left: 50%; bottom: 28px; z-index: 1000;
      padding: 12px 20px; border-radius: 999px;
      background: var(--pm-purple); color: #fff; font-size: 12.5px; font-weight: 700;
      box-shadow: var(--pm-shadow); font-family: 'Noto Sans KR', sans-serif;
      white-space: nowrap; max-width: 90vw; overflow: hidden; text-overflow: ellipsis;
      opacity: 0; pointer-events: none;
      transform: translateX(-50%) translateY(8px);
      transition: opacity .18s ease, transform .18s ease;
    }
    .bearip-toast.show { opacity: 1; pointer-events: auto; transform: translateX(-50%) translateY(0); }

    .bearip-back-btn {
      width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; margin-right: 8px;
      border: 1px solid var(--pm-border); background: var(--pm-panel); color: var(--pm-ink-soft);
      display: inline-flex; align-items: center; justify-content: center; padding: 0; cursor: pointer;
      transition: color .15s, border-color .15s;
    }
    .bearip-back-btn svg { width: 13px; height: 13px; }
    .bearip-back-btn:hover { color: var(--pm-ink); border-color: var(--pm-purple); }

    .bearip-pm-credit-row {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 10px 10px; margin-bottom: 4px; border-radius: 10px; background: var(--pm-active-bg);
    }
    .bearip-pm-credit-row .lbl { font-size: 11px; font-weight: 700; color: var(--pm-ink-soft); }
    .bearip-pm-credit-row .val { font-size: 14px; font-weight: 800; color: var(--pm-purple); }
    .bearip-pm-credit-topup {
      font-size: 10.5px; font-weight: 700; padding: 5px 10px; border-radius: 999px;
      border: none; background: var(--pm-purple); color: #fff; cursor: pointer; font-family: inherit;
    }

    .bearip-credit-overlay {
      --pm-panel: var(--dr-panel, var(--od-panel, var(--cr-bg-elev, var(--panel, #ffffff))));
      --pm-border: var(--dr-border, var(--od-border, var(--cr-border, var(--line, #e5e2f0))));
      --pm-ink: var(--dr-ink, var(--od-ink, var(--cr-ink, var(--ink, #201d33))));
      --pm-ink-soft: var(--dr-ink-soft, var(--od-ink-soft, var(--cr-ink-soft, var(--ink-soft, #8b879c))));
      --pm-purple: var(--dr-purple, var(--od-purple, var(--cr-purple, var(--purple-1, #6d4de6))));
      --pm-bg: var(--dr-bg, var(--od-bg, var(--cr-bg, #f6f6fb)));
      position: fixed; inset: 0; z-index: 1100;
      background: rgba(20,16,30,0.5);
      display: flex; align-items: center; justify-content: center; padding: 24px;
      font-family: 'Noto Sans KR', sans-serif;
    }
    .bearip-credit-box {
      background: var(--pm-panel); border-radius: 16px; padding: 22px;
      max-width: 340px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .bearip-credit-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .bearip-credit-head span { font-size: 15px; font-weight: 800; color: var(--pm-ink); }
    .bearip-credit-close {
      width: 28px; height: 28px; border-radius: 50%; border: none; background: var(--pm-bg);
      color: var(--pm-ink-soft); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    }
    .bearip-credit-close svg { width: 12px; height: 12px; }
    .bearip-credit-hint { font-size: 11.5px; color: var(--pm-ink-soft); line-height: 1.55; margin-bottom: 14px; }
    .bearip-credit-balance { font-size: 12.5px; color: var(--pm-ink-soft); margin-bottom: 14px; }
    .bearip-credit-balance strong { color: var(--pm-purple); font-size: 15px; }
    .bearip-credit-options { display: flex; flex-direction: column; gap: 8px; }
    .bearip-credit-opt {
      padding: 12px; border-radius: 12px; border: 1px solid var(--pm-border); background: var(--pm-bg);
      font-size: 13px; font-weight: 800; color: var(--pm-ink); cursor: pointer; font-family: inherit;
      display: flex; align-items: center; justify-content: space-between;
    }
    .bearip-credit-opt:hover { border-color: var(--pm-purple); color: var(--pm-purple); }
    .bearip-credit-opt .sub { font-size: 10.5px; font-weight: 700; color: var(--pm-ink-soft); }
  `;
  document.head.appendChild(style);
}

// ---- Credit top-up — a mock "충전" flow (no payment gateway exists in this
// prototype); the balance it adds to is real and shared by anything that
// spends credits (my-dna-render.js's 제작요청). Defined at top level, not
// nested in the DOMContentLoaded handler below, so any page/file can call
// bearipOpenCreditTopup() — e.g. a "크레딧이 부족해요" link elsewhere.
const BEARIP_CREDIT_TOPUP_OPTIONS = [
  { amount: 100, sub: '가벼운 파트 1개' },
  { amount: 300, sub: '가장 인기 있는 구성' },
  { amount: 1000, sub: '여러 파트를 한 번에' },
];

function bearipEnsureCreditTopupOverlay() {
  let overlay = document.getElementById('bearipCreditTopupOverlay');
  if (overlay) return overlay;
  bearipInjectProfileMenuStyles();
  overlay = document.createElement('div');
  overlay.className = 'bearip-credit-overlay';
  overlay.id = 'bearipCreditTopupOverlay';
  overlay.style.display = 'none';
  overlay.innerHTML = `
    <div class="bearip-credit-box">
      <div class="bearip-credit-head">
        <span>크레딧 충전</span>
        <button type="button" class="bearip-credit-close" id="bearipCreditTopupClose" aria-label="닫기">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <p class="bearip-credit-hint">실제 결제는 연결되어 있지 않은 프로토타입이라, 선택하면 바로 충전돼요.</p>
      <div class="bearip-credit-balance">현재 잔액 <strong id="bearipCreditTopupBalance">0</strong>C</div>
      <div class="bearip-credit-options">
        ${BEARIP_CREDIT_TOPUP_OPTIONS.map(
          (opt) => `<button type="button" class="bearip-credit-opt" data-amount="${opt.amount}"><span>${opt.amount}C</span><span class="sub">${opt.sub}</span></button>`
        ).join('')}
      </div>
    </div>
  `;
  // Appended inside whichever shell root is on the page (same rule as every
  // other overlay here) — a plain document.body append would sit outside
  // .dna-app/.od-app and the var() fallback chain above would resolve to
  // nothing, rendering the box transparent in both themes.
  const root = document.querySelector('.dna-app, .od-app, .cr-app, .lg-app, .ni-app') || document.body;
  root.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('#bearipCreditTopupClose')) {
      overlay.style.display = 'none';
      return;
    }
    const opt = e.target.closest('.bearip-credit-opt');
    if (!opt) return;
    const amount = parseInt(opt.dataset.amount, 10);
    bearipAddCredits(amount);
    document.getElementById('bearipCreditTopupBalance').textContent = bearipGetCredits();
    bearipRefreshCreditDisplays();
    bearipShowToast(`${amount}C를 충전했어요`);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display !== 'none') overlay.style.display = 'none';
  });
  return overlay;
}

function bearipOpenCreditTopup() {
  const overlay = bearipEnsureCreditTopupOverlay();
  document.getElementById('bearipCreditTopupBalance').textContent = bearipGetCredits();
  overlay.style.display = 'flex';
}

// Keeps every visible balance (profile menu, any 제작요청 modal open at the
// same time) in sync right after a top-up, instead of only the popup that
// triggered it.
function bearipRefreshCreditDisplays() {
  document.querySelectorAll('.bearip-credit-balance-display').forEach((el) => {
    el.textContent = bearipGetCredits() + 'C';
  });
  if (typeof mdRefreshProductionBalance === 'function') mdRefreshProductionBalance();
}

let bearipToastEl = null;
let bearipToastTimer = null;
function bearipShowToast(message) {
  bearipInjectProfileMenuStyles();
  if (!bearipToastEl) {
    const root = document.querySelector('.dna-app, .od-app, .cr-app, .lg-app, .ni-app') || document.body;
    bearipToastEl = document.createElement('div');
    bearipToastEl.className = 'bearip-toast';
    root.appendChild(bearipToastEl);
  }
  bearipToastEl.textContent = message;
  bearipToastEl.classList.add('show');
  clearTimeout(bearipToastTimer);
  bearipToastTimer = setTimeout(() => bearipToastEl.classList.remove('show'), 2200);
}

document.addEventListener('click', (e) => {
  const soon = e.target.closest('.bearip-soon');
  if (soon) {
    e.preventDefault();
    bearipShowToast(soon.dataset.soonMessage || '더 많은 항목은 아직 준비 중이에요');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const dest = () => (typeof bearipGetUser === 'function' && bearipGetUser() ? 'profile.html' : 'login.html');

  // Remember which shell (light sidebar/topbar vs dark CONTENT ROOM) the
  // user is currently browsing in, so a page like notifications.html —
  // reachable from any of them — can render in a matching shell instead of
  // always defaulting to light. Named bearip_shell_theme (not bearip_theme)
  // to stay distinct from the user's light/dark mode preference in
  // localStorage (storage.js) — same word, different axis, different store.
  const appRoot = document.querySelector('.dna-app, .od-app, .cr-app, .lg-app, .ni-app');
  // Chameleon pages (like notifications.html) render in whichever shell was
  // last recorded rather than having one of their own, so they must not
  // overwrite the flag they just read.
  if (appRoot && !document.body.classList.contains('chameleon-page')) {
    sessionStorage.setItem('bearip_shell_theme', appRoot.classList.contains('cr-app') ? 'dark' : 'light');
  }

  // "Back to X" (.dr-back-home / .od-back-home / .cr-back-home) is a plain,
  // fixed-destination link again — it always goes to the same place, same
  // as before. A separate, independent 뒤로가기 button (inserted just before
  // it) does the actual history navigation instead, so the two controls
  // each do exactly one predictable thing rather than one link trying to
  // be both.
  bearipInjectProfileMenuStyles();
  document.querySelectorAll('.dr-back-home, .od-back-home, .cr-back-home').forEach((homeLink) => {
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'bearip-back-btn';
    backBtn.setAttribute('aria-label', '뒤로가기');
    backBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>';
    backBtn.addEventListener('click', () => history.back());
    homeLink.parentNode.insertBefore(backBtn, homeLink);
  });

  if (typeof bearipSeedNotificationsIfEmpty === 'function') bearipSeedNotificationsIfEmpty();
  const unread = typeof bearipGetUnreadCount === 'function' ? bearipGetUnreadCount() : 0;

  // Bell: unchanged — jumps straight to the notifications page.
  document.querySelectorAll('.dr-icon-btn[aria-label="알림"], .od-icon-btn[aria-label="알림"]').forEach((btn) => {
    let dot = btn.querySelector('.dot');
    if (unread > 0 && !dot) {
      dot = document.createElement('span');
      dot.className = 'dot';
      btn.appendChild(dot);
    }
    if (dot) dot.style.display = unread > 0 ? '' : 'none';
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', () => {
      location.href = 'notifications.html';
    });
  });

  const chips = document.querySelectorAll('.dr-profile-chip, .od-avatar-chip, .cr-profile');
  if (chips.length === 0) return;

  // Show the real nickname where the chip has a name slot.
  const user = typeof bearipGetUser === 'function' ? bearipGetUser() : null;
  document.querySelectorAll('.dr-profile-chip .uname').forEach((el) => {
    el.textContent = user ? user.nickname : '로그인';
  });

  bearipInjectProfileMenuStyles();
  const root = appRoot || document.body;
  const menu = document.createElement('div');
  menu.className = 'bearip-pm';
  root.appendChild(menu);

  // Every dr-*/od-* page (DNA ROOM, MY DNA, GUIDE, PROFILE, NOTIFICATIONS,
  // OPEN DNA, CREW MATCH, IP DETAIL) has a real light/dark mode now — the
  // landing page and CONTENT ROOM are the only ones left out (CONTENT ROOM
  // is on hold: its CSS isn't variable-driven the same way yet).
  const themedPage = !!(appRoot && (appRoot.classList.contains('od-app') || appRoot.classList.contains('dna-app')));
  function themeToggleRowHtml() {
    if (!themedPage) return '';
    const isDark = document.documentElement.dataset.theme === 'dark';
    return `
      <div class="bearip-pm-switch-row">
        <span>다크 모드</span>
        <button type="button" class="bearip-pm-switch${isDark ? ' on' : ''}" data-action="toggle-theme" role="switch" aria-checked="${isDark}" aria-label="다크 모드 전환">
          <span class="knob"></span>
        </button>
      </div>`;
  }

  function creditRowHtml() {
    return `
      <div class="bearip-pm-credit-row">
        <div><span class="lbl">크레딧 </span><span class="val bearip-credit-balance-display">${bearipGetCredits()}C</span></div>
        <button type="button" class="bearip-pm-credit-topup" data-action="topup-credits">충전하기</button>
      </div>`;
  }

  function renderMenu() {
    const u = typeof bearipGetUser === 'function' ? bearipGetUser() : null;
    if (u) {
      menu.innerHTML = `
        <div class="bearip-pm-header">
          <div class="bearip-pm-avatar">${bearipEscapeHtml((u.nickname || '?').slice(0, 1))}</div>
          <div class="bearip-pm-info">
            <div class="bearip-pm-name">${bearipEscapeHtml(u.nickname || '게스트')}</div>
            <div class="bearip-pm-bio">${bearipEscapeHtml(u.bio || '아직 소개가 없어요')}</div>
          </div>
        </div>
        <div class="bearip-pm-divider"></div>
        ${creditRowHtml()}
        <button class="bearip-pm-btn primary" data-action="profile">내 정보 수정 →</button>
        <button class="bearip-pm-btn" data-action="notifications">알림함</button>
        ${themeToggleRowHtml()}
        <button class="bearip-pm-btn danger" data-action="logout">로그아웃</button>
      `;
    } else {
      menu.innerHTML = `
        <div class="bearip-pm-guest-t">로그인이 필요해요</div>
        <div class="bearip-pm-guest-s">닉네임만 입력하면 바로 시작할 수 있어요.</div>
        <button class="bearip-pm-btn primary" data-action="login">로그인하기 →</button>
        ${themeToggleRowHtml()}
      `;
    }
  }

  function positionMenu(chip) {
    const r = chip.getBoundingClientRect();
    const top = Math.min(r.bottom + 8, window.innerHeight - 20);
    const right = Math.max(window.innerWidth - r.right, 12);
    menu.style.top = top + 'px';
    menu.style.right = right + 'px';
  }

  let openChip = null;

  function openMenu(chip) {
    renderMenu();
    positionMenu(chip);
    menu.classList.add('show');
    openChip = chip;
  }

  function closeMenu() {
    menu.classList.remove('show');
    openChip = null;
  }

  chips.forEach((chip) => {
    chip.style.cursor = 'pointer';
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      if (openChip === chip) {
        closeMenu();
      } else {
        openMenu(chip);
      }
    });
  });

  menu.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'logout') {
      bearipLogout();
      location.href = 'index.html';
    } else if (action === 'profile') {
      location.href = 'profile.html';
    } else if (action === 'notifications') {
      location.href = 'notifications.html';
    } else if (action === 'login') {
      bearipGoToLogin();
    } else if (action === 'toggle-theme') {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      if (typeof bearipSetTheme === 'function') bearipSetTheme(next);
      // Just flips the switch in place — the menu stays open, unlike every
      // other row here which navigates away or logs out. Stop the click from
      // reaching the document-level "click outside" listener: renderMenu()
      // below replaces this button with a new node, so by the time that
      // listener runs, e.target is detached and menu.contains(e.target)
      // would wrongly read as false, closing the menu.
      e.stopPropagation();
      renderMenu();
    } else if (action === 'topup-credits') {
      e.stopPropagation();
      closeMenu();
      bearipOpenCreditTopup();
    }
  });

  document.addEventListener('click', (e) => {
    if (openChip && !menu.contains(e.target)) closeMenu();
  });
  window.addEventListener('resize', closeMenu);
  window.addEventListener('scroll', closeMenu, true);

  // Search inputs/buttons that aren't wired to real filtering yet (CREW
  // MATCH's is — it's excluded by id) get honest "준비 중" feedback instead
  // of silently doing nothing.
  document.querySelectorAll('.od-search input, .cr-search input').forEach((input) => {
    if (input.id === 'cmSearchInput') return;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        bearipShowToast('검색 기능은 아직 준비 중이에요');
      }
    });
  });
  document.querySelectorAll('.dr-icon-btn[aria-label="검색"]').forEach((btn) => {
    btn.addEventListener('click', () => bearipShowToast('검색 기능은 아직 준비 중이에요'));
  });
});
