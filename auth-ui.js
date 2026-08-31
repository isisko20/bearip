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
  `;
  document.head.appendChild(style);
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

  // Remember which shell theme the user is currently browsing in (light
  // sidebar/topbar vs dark CONTENT ROOM) so a page like notifications.html —
  // reachable from any of them — can render in a matching theme instead of
  // always defaulting to light.
  const appRoot = document.querySelector('.dna-app, .od-app, .cr-app, .lg-app, .ni-app');
  // Chameleon pages (like notifications.html) render in whichever theme was
  // last recorded rather than having one of their own, so they must not
  // overwrite the flag they just read.
  if (appRoot && !document.body.classList.contains('chameleon-page')) {
    sessionStorage.setItem('bearip_theme', appRoot.classList.contains('cr-app') ? 'dark' : 'light');
  }

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
        <button class="bearip-pm-btn primary" data-action="profile">내 정보 수정 →</button>
        <button class="bearip-pm-btn" data-action="notifications">알림함</button>
        <button class="bearip-pm-btn danger" data-action="logout">로그아웃</button>
      `;
    } else {
      menu.innerHTML = `
        <div class="bearip-pm-guest-t">로그인이 필요해요</div>
        <div class="bearip-pm-guest-s">닉네임만 입력하면 바로 시작할 수 있어요.</div>
        <button class="bearip-pm-btn primary" data-action="login">로그인하기 →</button>
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
