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

// ---- 신고하기 모달 (쪽지·크루 채팅·댓글 공용) ----
// 신고 사유 + 선택 메모, 그리고 "이 사용자 차단하기" 체크박스 하나로 신고와
// 차단을 한 번에 처리해요. 접수는 storage.js의 bearipSubmitReport가 맡고
// (같은 글 중복 신고는 한 건으로 합쳐짐), 끝나면 onDone으로 호출한 화면이
// 다시 그려지게 해요 — 차단하면 그 사람 글이 바로 사라져야 하니까요.
function bearipInjectReportStyles() {
  if (document.getElementById('bearip-report-style')) return;
  const style = document.createElement('style');
  style.id = 'bearip-report-style';
  style.textContent = `
    .bearip-report-overlay {
      --rp-panel: var(--dr-panel, var(--od-panel, var(--cr-bg-elev, var(--panel, #ffffff))));
      --rp-border: var(--dr-border, var(--od-border, var(--cr-border, var(--line, #e5e2f0))));
      --rp-ink: var(--dr-ink, var(--od-ink, var(--cr-ink, var(--ink, #201d33))));
      --rp-ink-soft: var(--dr-ink-soft, var(--od-ink-soft, var(--cr-ink-soft, var(--ink-soft, #8b879c))));
      --rp-purple: var(--dr-purple, var(--od-purple, var(--cr-purple, var(--purple-1, #6d4de6))));
      position: fixed; inset: 0; z-index: 1100; display: flex; align-items: center; justify-content: center;
      background: rgba(10, 8, 24, 0.55); padding: 16px; font-family: 'Noto Sans KR', sans-serif;
    }
    .bearip-report-box {
      width: 100%; max-width: 380px; max-height: 90vh; overflow-y: auto;
      background: var(--rp-panel); color: var(--rp-ink); border: 1px solid var(--rp-border);
      border-radius: 18px; padding: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.35);
    }
    .bearip-report-box h3 { margin: 0 0 4px; font-size: 16px; font-weight: 800; }
    .bearip-report-box .rp-sub { font-size: 12px; color: var(--rp-ink-soft); margin-bottom: 12px; }
    .bearip-report-box .rp-quote {
      font-size: 12px; line-height: 1.5; padding: 9px 11px; margin-bottom: 14px; border-radius: 10px;
      border: 1px solid var(--rp-border); color: var(--rp-ink-soft); word-break: break-word;
      max-height: 78px; overflow: hidden;
    }
    .bearip-report-box .rp-label { font-size: 12px; font-weight: 800; margin-bottom: 6px; }
    .bearip-report-box .rp-reason { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 5px 0; cursor: pointer; }
    .bearip-report-box .rp-reason input { accent-color: var(--rp-purple); }
    .bearip-report-box textarea {
      width: 100%; box-sizing: border-box; margin-top: 8px; min-height: 58px; resize: vertical;
      border: 1px solid var(--rp-border); border-radius: 10px; padding: 9px 11px; font: inherit; font-size: 12.5px;
      background: transparent; color: var(--rp-ink);
    }
    .bearip-report-box .rp-block { display: flex; align-items: center; gap: 8px; font-size: 12.5px; margin: 12px 0 16px; cursor: pointer; }
    .bearip-report-box .rp-block input { accent-color: var(--rp-purple); }
    .bearip-report-box .rp-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .bearip-report-box .rp-actions button {
      padding: 9px 16px; border-radius: 999px; font: inherit; font-size: 12.5px; font-weight: 800; cursor: pointer;
      border: 1px solid var(--rp-border); background: transparent; color: var(--rp-ink);
    }
    .bearip-report-box .rp-actions .rp-submit { background: var(--rp-purple); border-color: var(--rp-purple); color: #fff; }
    .bearip-report-link, .bearip-delete-link {
      border: none; background: none; padding: 0; margin-left: 8px; font: inherit; font-size: 11px;
      color: inherit; opacity: 0.55; cursor: pointer; text-decoration: underline;
    }
    .bearip-report-link:hover, .bearip-delete-link:hover { color: #e5484d; opacity: 1; }
    .bearip-report-box .rp-text { font-size: 12.5px; line-height: 1.6; margin: 6px 0 14px; color: var(--rp-ink-soft); }
    .bearip-report-box input[type="password"] {
      width: 100%; box-sizing: border-box; margin-bottom: 8px; padding: 10px 12px; border-radius: 10px;
      border: 1px solid var(--rp-border); background: transparent; color: var(--rp-ink); font: inherit; font-size: 13px;
    }
    .bearip-report-box .rp-error { font-size: 11.5px; color: #e5484d; min-height: 16px; margin-bottom: 8px; }
  `;
  document.head.appendChild(style);
}

// 신고/삭제 링크는 모달이 열리기 전부터 화면에 있으니 스타일도 미리 넣어둬요.
document.addEventListener('DOMContentLoaded', bearipInjectReportStyles);

// ---- 계정 잠금 안내 (PIN 도입 전에 이미 로그인해 있던 사람용) ----
// PIN이 생기기 전에 로그인한 브라우저는 pinVerified 표시가 없어요. 그런 세션이
// 열리면 계정을 한 번 조회해서:
//   · 아직 아무도 안 잠근 닉네임 → "PIN 설정" 안내 (GM 닉네임은 건너뛸 수 없음)
//   · 이미 PIN이 걸린 닉네임 → 그 닉네임을 쓰던 사람이 맞는지 알 수 없으므로
//     다시 로그인(PIN 입력)하도록 막아요. 먼저 잠근 쪽이 항상 이겨요.
// 서버에 닿지 못하면 아무것도 막지 않고 넘어가요 (오프라인이라고 못 쓰게 하진 않아요).
function bearipShowAccountModal(mode, user) {
  if (document.getElementById('bearipAccountOverlay')) return;
  bearipInjectReportStyles();
  const esc = bearipEscapeHtml;
  const root = document.querySelector('.dna-app, .od-app, .cr-app, .lg-app, .ni-app') || document.body;
  const overlay = document.createElement('div');
  overlay.id = 'bearipAccountOverlay';
  overlay.className = 'bearip-report-overlay';
  const canSkip = mode === 'claim' && user.nickname !== 'GM';

  overlay.innerHTML =
    mode === 'relogin'
      ? `<div class="bearip-report-box" role="dialog" aria-label="다시 로그인">
          <h3>다시 로그인해주세요</h3>
          <div class="rp-text">'${esc(user.nickname)}' 닉네임은 이제 PIN으로 보호돼요. 본인 확인을 위해 PIN을 입력해서 다시 로그인해주세요.</div>
          <div class="rp-actions"><button type="button" class="rp-submit" id="bearipAccountRelogin">로그인하기</button></div>
        </div>`
      : `<div class="bearip-report-box" role="dialog" aria-label="닉네임 지키기">
          <h3>닉네임을 지키세요</h3>
          <div class="rp-text">'${esc(user.nickname)}' 닉네임에 PIN을 설정하면 다른 사람이 이 닉네임으로 로그인할 수 없어요. PIN은 나중에 직접 바꾸거나 찾을 수 없으니 꼭 기억해두세요.${canSkip ? '' : ' (이 닉네임은 반드시 설정해야 해요)'}</div>
          <input type="password" id="bearipAccountPin" placeholder="PIN (${BEARIP_PIN_MIN_LENGTH}자 이상)" maxlength="30" autocomplete="new-password">
          <input type="password" id="bearipAccountPin2" placeholder="PIN 확인" maxlength="30" autocomplete="new-password">
          <div class="rp-error" id="bearipAccountError"></div>
          <div class="rp-actions">
            ${canSkip ? '<button type="button" id="bearipAccountLater">나중에</button>' : ''}
            <button type="button" class="rp-submit" id="bearipAccountSet">PIN 설정하기</button>
          </div>
        </div>`;

  const close = () => overlay.remove();
  root.appendChild(overlay);

  if (mode === 'relogin') {
    overlay.querySelector('#bearipAccountRelogin').addEventListener('click', () => {
      bearipLogout();
      bearipGoToLogin();
    });
    return;
  }

  const errorEl = overlay.querySelector('#bearipAccountError');
  const later = overlay.querySelector('#bearipAccountLater');
  if (later) {
    later.addEventListener('click', () => {
      try {
        sessionStorage.setItem('bearip_pin_snooze', '1');
      } catch (e) {
        /* best-effort */
      }
      close();
    });
  }
  overlay.querySelector('#bearipAccountSet').addEventListener('click', async (e) => {
    const pin = overlay.querySelector('#bearipAccountPin').value;
    const pin2 = overlay.querySelector('#bearipAccountPin2').value;
    errorEl.textContent = '';
    if (pin.length < BEARIP_PIN_MIN_LENGTH) {
      errorEl.textContent = `PIN은 ${BEARIP_PIN_MIN_LENGTH}자 이상 입력해주세요.`;
      return;
    }
    if (pin !== pin2) {
      errorEl.textContent = 'PIN이 서로 달라요. 다시 입력해주세요.';
      return;
    }
    e.target.disabled = true;
    try {
      await bearipCreateAccount(user.nickname, pin);
      bearipSetUser(Object.assign({}, bearipGetUser() || user, { pinVerified: true }));
      close();
      bearipShowToast('PIN을 설정했어요. 이제 닉네임이 잠겼어요');
    } catch (err) {
      e.target.disabled = false;
      if (err.message === 'taken') {
        // 그 사이 다른 사람이 먼저 이 닉네임을 잠갔어요.
        close();
        bearipShowAccountModal('relogin', user);
        return;
      }
      errorEl.textContent = '설정하지 못했어요. 잠시 후 다시 시도해주세요.';
    }
  });
}

async function bearipAccountGate() {
  const user = typeof bearipGetUser === 'function' ? bearipGetUser() : null;
  if (!user || user.pinVerified) return;
  let account;
  try {
    account = await bearipFetchAccount(user.nickname);
  } catch (e) {
    return;
  }
  if (account) {
    bearipShowAccountModal('relogin', user);
    return;
  }
  let snoozed = false;
  try {
    snoozed = sessionStorage.getItem('bearip_pin_snooze') === '1';
  } catch (e) {
    /* best-effort */
  }
  if (!snoozed || user.nickname === 'GM') bearipShowAccountModal('claim', user);
}

document.addEventListener('DOMContentLoaded', bearipAccountGate);

function bearipOpenReportModal(opts) {
  const user = typeof bearipGetUser === 'function' ? bearipGetUser() : null;
  if (!user || !opts || !opts.targetNickname || opts.targetNickname === user.nickname) return;
  bearipInjectReportStyles();
  const esc = bearipEscapeHtml;
  const root = document.querySelector('.dna-app, .od-app, .cr-app, .lg-app, .ni-app') || document.body;
  const overlay = document.createElement('div');
  overlay.className = 'bearip-report-overlay';
  overlay.innerHTML = `
    <div class="bearip-report-box" role="dialog" aria-label="신고하기">
      <h3>신고하기</h3>
      <div class="rp-sub">${esc(opts.targetNickname)}님의 ${esc(opts.contextLabel || '글')}</div>
      <div class="rp-quote">${esc(opts.text || '')}</div>
      <div class="rp-label">신고 사유</div>
      ${BEARIP_REPORT_REASONS.map((r, i) => `<label class="rp-reason"><input type="radio" name="bearipRpReason" value="${esc(r)}"${i === 0 ? ' checked' : ''}>${esc(r)}</label>`).join('')}
      <textarea maxlength="200" placeholder="추가로 알려주실 내용이 있다면 적어주세요 (선택)"></textarea>
      <label class="rp-block"><input type="checkbox" id="bearipRpBlock"> 이 사용자 차단하기 (쪽지·댓글·크루 채팅이 내 화면에서 사라져요)</label>
      <div class="rp-actions">
        <button type="button" class="rp-cancel">취소</button>
        <button type="button" class="rp-submit">신고하기</button>
      </div>
    </div>
  `;
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('.rp-cancel').addEventListener('click', close);
  overlay.querySelector('.rp-submit').addEventListener('click', () => {
    const reason = (overlay.querySelector('input[name="bearipRpReason"]:checked') || {}).value;
    const note = overlay.querySelector('textarea').value.trim();
    const blockToo = overlay.querySelector('#bearipRpBlock').checked;
    const filed = bearipSubmitReport({
      type: opts.type,
      targetNickname: opts.targetNickname,
      targetId: opts.targetId,
      text: opts.text,
      contextLabel: opts.contextLabel,
      reason,
      note,
    });
    if (blockToo) bearipBlockUser(opts.targetNickname);
    close();
    bearipShowToast(
      filed === 'duplicate'
        ? blockToo ? '이미 신고한 글이에요. 차단은 적용했어요' : '이미 신고한 글이에요'
        : !filed
          ? '신고를 접수하지 못했어요. 잠시 후 다시 시도해주세요'
          : blockToo ? '신고를 접수하고 차단했어요' : '신고를 접수했어요'
    );
    if (typeof opts.onDone === 'function') opts.onDone();
  });
  root.appendChild(overlay);
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

  // Bell: jumps straight to the notifications page. Notifications now arrive
  // live from Firebase (see storage.js), so the unread dot is refreshed both
  // now and again whenever fresh data streams in — not just on page load.
  function bearipRefreshNotifBell() {
    const unread = typeof bearipGetUnreadCount === 'function' ? bearipGetUnreadCount() : 0;
    document.querySelectorAll('.dr-icon-btn[aria-label="알림"], .od-icon-btn[aria-label="알림"]').forEach((btn) => {
      let dot = btn.querySelector('.dot');
      if (unread > 0 && !dot) {
        dot = document.createElement('span');
        dot.className = 'dot';
        btn.appendChild(dot);
      }
      if (dot) dot.style.display = unread > 0 ? '' : 'none';
    });
  }
  bearipRefreshNotifBell();
  if (typeof bearipOnDataChange === 'function') bearipOnDataChange('notifications', bearipRefreshNotifBell);

  document.querySelectorAll('.dr-icon-btn[aria-label="알림"], .od-icon-btn[aria-label="알림"]').forEach((btn) => {
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', () => {
      location.href = 'notifications.html';
    });
  });

  // 메시지 icon — same live-refresh pattern as the bell above, just counting
  // unread DM threads (bearipLoadMyDmThreads) instead of notifications.
  function bearipRefreshMessageIcon() {
    const unread = typeof bearipLoadMyDmThreads === 'function' ? bearipLoadMyDmThreads().filter((t) => t.unread).length : 0;
    document.querySelectorAll('.dr-icon-btn[aria-label="메시지"], .od-icon-btn[aria-label="메시지"]').forEach((btn) => {
      let dot = btn.querySelector('.dot');
      if (unread > 0 && !dot) {
        dot = document.createElement('span');
        dot.className = 'dot';
        btn.appendChild(dot);
      }
      if (dot) dot.style.display = unread > 0 ? '' : 'none';
    });
  }
  bearipRefreshMessageIcon();
  if (typeof bearipOnDataChange === 'function') bearipOnDataChange('dmThreads', bearipRefreshMessageIcon);

  document.querySelectorAll('.dr-icon-btn[aria-label="메시지"], .od-icon-btn[aria-label="메시지"]').forEach((btn) => {
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', () => {
      if (typeof bearipRequireLogin === 'function' && !bearipRequireLogin('messages.html')) return;
      location.href = 'messages.html';
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
      const isGm = u.nickname === 'GM';
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
        <button class="bearip-pm-btn" data-action="crew-applicants">지원자 관리</button>
        ${
          isGm
            ? `<button class="bearip-pm-btn" data-action="production-admin">제작요청 관리 (GM)</button>
        <button class="bearip-pm-btn" data-action="ip-review-admin">전문가 검토 관리 (GM)</button>`
            : ''
        }
        ${themeToggleRowHtml()}
        <button class="bearip-pm-btn danger" data-action="logout">로그아웃</button>
      `;
    } else {
      menu.innerHTML = `
        <div class="bearip-pm-guest-t">로그인이 필요해요</div>
        <div class="bearip-pm-guest-s">닉네임과 PIN만 입력하면 바로 시작할 수 있어요.</div>
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
    } else if (action === 'production-admin') {
      location.href = 'production-requests.html';
    } else if (action === 'crew-applicants') {
      location.href = 'crew-applicants.html';
    } else if (action === 'ip-review-admin') {
      location.href = 'ip-reviews.html';
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

  // Search from any page that doesn't have its own filtering: hands the query
  // to OPEN DNA (whose search box filters real published IPs by title,
  // keyword and tag) via the same one-shot sessionStorage handoff pattern the
  // rest of the app uses — open-dna-search.js consumes it on load. CREW MATCH's,
  // OPEN DNA's and CONTENT ROOM's own search inputs filter in place and are
  // excluded by id.
  function bearipSearchGo(q) {
    q = (q || '').trim();
    if (!q) return;
    sessionStorage.setItem('bearip_open_dna_query', q);
    location.href = 'open-dna.html';
  }

  const SELF_FILTERING_SEARCH_IDS = ['cmSearchInput', 'odSearchInput', 'crSearchInput', 'crHeaderSearchInput'];
  document.querySelectorAll('.od-search input, .cr-search input').forEach((input) => {
    if (SELF_FILTERING_SEARCH_IDS.includes(input.id)) return;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        bearipSearchGo(input.value);
      }
    });
  });

  // The dr-* pages only have a magnifier icon, no input — open a small
  // search box under it.
  function bearipInjectSearchPopStyles() {
    if (document.getElementById('bearipSearchPopStyles')) return;
    const style = document.createElement('style');
    style.id = 'bearipSearchPopStyles';
    style.textContent = `
      .bearip-search-pop { position: fixed; z-index: 9999; display: flex; gap: 8px; padding: 10px;
        background: var(--dr-panel, var(--od-panel, #fff)); border: 1px solid var(--dr-border, var(--od-border, #e9e7f3));
        border-radius: 14px; box-shadow: 0 12px 34px rgba(43,32,92,0.18); }
      .bearip-search-pop input { width: 220px; padding: 9px 13px; border-radius: 999px; font-size: 13px; font-family: inherit;
        border: 1px solid var(--dr-border, var(--od-border, #e9e7f3)); background: var(--dr-bg-soft, var(--od-bg, #f6f5fb));
        color: var(--dr-ink, var(--od-ink, #1c1830)); outline: none; }
      .bearip-search-pop input:focus { border-color: var(--dr-purple, var(--od-purple, #6d4de6)); }
      .bearip-search-pop button { padding: 9px 16px; border-radius: 999px; border: none; font-size: 12.5px; font-weight: 700;
        background: var(--dr-purple, var(--od-purple, #6d4de6)); color: #fff; cursor: pointer; font-family: inherit; }
    `;
    document.head.appendChild(style);
  }

  function bearipToggleSearchPop(anchor) {
    const existing = document.getElementById('bearipSearchPop');
    if (existing) {
      existing.remove();
      return;
    }
    bearipInjectSearchPopStyles();
    const pop = document.createElement('div');
    pop.id = 'bearipSearchPop';
    pop.className = 'bearip-search-pop';
    pop.innerHTML = '<input type="text" placeholder="프로젝트, 키워드, 태그 검색" maxlength="40"><button type="button">검색</button>';
    document.body.appendChild(pop);

    const rect = anchor.getBoundingClientRect();
    pop.style.top = rect.bottom + 8 + 'px';
    pop.style.right = Math.max(12, window.innerWidth - rect.right) + 'px';

    const input = pop.querySelector('input');
    const close = () => {
      pop.remove();
      document.removeEventListener('click', onOutside, true);
      document.removeEventListener('keydown', onKey);
    };
    const onOutside = (e) => {
      if (!pop.contains(e.target) && !anchor.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    input.focus();
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') bearipSearchGo(input.value);
    });
    pop.querySelector('button').addEventListener('click', () => bearipSearchGo(input.value));
    document.addEventListener('click', onOutside, true);
    document.addEventListener('keydown', onKey);
  }

  document.querySelectorAll('.dr-icon-btn[aria-label="검색"]').forEach((btn) => {
    btn.addEventListener('click', () => bearipToggleSearchPop(btn));
  });
});
