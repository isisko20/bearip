// Category tab switching (visual only) — scoped per .od-tabs group so a page
// with more than one tab bar (e.g. role filter + page tabs) doesn't cross-toggle.
// A tab marked .disabled (category not built out yet) never becomes active;
// clicking it just surfaces a per-category "아직 준비 중" note instead.
document.querySelectorAll('.od-tabs').forEach((group) => {
  group.querySelectorAll('.od-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      if (tab.classList.contains('disabled')) {
        if (typeof onDisabledTabClick === 'function') onDisabledTabClick(tab);
        return;
      }
      group.querySelectorAll('.od-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
});

// Bookmark toggle — requires login, persists per IP, restores on reload.
const OD_BOOKMARK_KEY = 'bearip_bookmarked_ips';

function odSetBookmarkUI(btn, bookmarked) {
  btn.querySelector('svg').setAttribute('fill', bookmarked ? 'currentColor' : 'none');
  btn.style.color = bookmarked ? 'var(--od-purple)' : 'var(--od-ink-soft)';
}

// Shared so dynamically-inserted cards (e.g. open-dna-published.js) can wire
// their own bookmark buttons the same way without duplicating this logic.
function odWireBookmarkButton(btn) {
  if (btn.dataset.ip && typeof bearipSetHas === 'function') {
    odSetBookmarkUI(btn, bearipSetHas(OD_BOOKMARK_KEY, btn.dataset.ip));
  }
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!btn.dataset.ip) return;
    if (typeof bearipRequireLogin === 'function' && !bearipRequireLogin('open-dna.html')) return;
    const bookmarked = bearipSetToggle(OD_BOOKMARK_KEY, btn.dataset.ip);
    odSetBookmarkUI(btn, bookmarked);
  });
}

document.querySelectorAll('.od-bookmark').forEach(odWireBookmarkButton);

// ---- Read-only "IP DNA 현황" popup, opened from a card's DNA stat ----
// Shares category/tip/tier logic with MY DNA (storage.js) so the numbers
// and copy never drift apart — this view just has no sliders, since these
// are other IPs' published progress, not something to edit here.
function odEnsureDnaReportOverlay() {
  let overlay = document.getElementById('odDnaReportOverlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'od-dna-report-overlay';
  overlay.id = 'odDnaReportOverlay';
  overlay.style.display = 'none';
  overlay.innerHTML = `
    <div class="od-dna-report-box">
      <div class="od-dna-report-head">
        <div>
          <div class="t">IP DNA 현황</div>
          <div class="s" id="odDnaReportSub"></div>
        </div>
        <button type="button" class="od-dna-report-close" id="odDnaReportClose" aria-label="닫기">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <div class="od-dna-report-body">
        <div class="od-dna-tiles" id="odDnaReportTiles"></div>
        <div class="od-dna-score-panel">
          <div class="od-dna-score-ring" id="odDnaReportRing">
            <div class="od-dna-score-ring-inner">
              <span class="v" id="odDnaReportScoreValue">0%</span>
              <span class="t" id="odDnaReportScoreTier">-</span>
            </div>
          </div>
          <p class="od-dna-score-hint">6개 항목의 평균으로 계산된 점수예요.</p>
        </div>
      </div>
    </div>
  `;
  // Appended inside .od-app (not just body) so it inherits the page's
  // --od-* theme variables — otherwise var(--od-panel) etc. resolve to
  // nothing outside that scope and the box renders transparent.
  (document.querySelector('.od-app') || document.body).appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('#odDnaReportClose')) odCloseDnaReport();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display !== 'none') odCloseDnaReport();
  });
  return overlay;
}

function odCloseDnaReport() {
  const overlay = document.getElementById('odDnaReportOverlay');
  if (overlay) overlay.style.display = 'none';
}

function odOpenDnaReport(title, breakdown, score) {
  const overlay = odEnsureDnaReportOverlay();
  document.getElementById('odDnaReportSub').textContent = `'${title}'의 항목별 완성도예요`;
  document.getElementById('odDnaReportTiles').innerHTML = BEARIP_DNA_CATEGORIES.map((cat, i) => {
    const value = (breakdown && breakdown[cat.key]) || 0;
    return `
      <div class="od-dna-tile">
        <div class="od-dna-tile-ic">${cat.icon}</div>
        <div class="od-dna-tile-num">0${i + 1}</div>
        <div class="od-dna-tile-label">${cat.label}</div>
        <div class="od-dna-tile-value">${value}%</div>
        <div class="od-dna-tile-tip">${bearipDnaTip(cat.key, value)}</div>
      </div>
    `;
  }).join('');
  document.getElementById('odDnaReportScoreValue').textContent = score + '%';
  document.getElementById('odDnaReportScoreTier').textContent = bearipDnaScoreTier(score);
  document.getElementById('odDnaReportRing').style.setProperty('--p', score);
  overlay.style.display = 'flex';
}

// ---- 지원하기 modal — lets an applicant leave a real message instead of
// the apply button just toggling state with zero input. Shared by
// crew-match-post.js (browse-list postings) and ip-detail.js (an IP's own
// recruit panel), which both load this file.
let odApplyModalSubmitHandler = null;

function odEnsureApplyModal() {
  let overlay = document.getElementById('odApplyModalOverlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'od-apply-modal-overlay';
  overlay.id = 'odApplyModalOverlay';
  overlay.style.display = 'none';
  overlay.innerHTML = `
    <div class="od-apply-modal-box">
      <div class="od-apply-modal-head">
        <div>
          <div class="t">지원하기</div>
          <div class="s" id="odApplyModalSub"></div>
        </div>
        <button type="button" class="od-apply-modal-close" id="odApplyModalClose" aria-label="닫기">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <label class="od-apply-modal-label" for="odApplyModalMessage">지원 메시지 (선택)</label>
      <textarea id="odApplyModalMessage" placeholder="간단한 인사말이나 지원 이유를 남겨보세요."></textarea>
      <div class="od-apply-modal-hint">비워두고 지원해도 괜찮아요.</div>
      <div class="od-apply-modal-actions">
        <button type="button" class="od-apply-modal-cancel" id="odApplyModalCancel">취소</button>
        <button type="button" class="od-apply-modal-submit" id="odApplyModalSubmit">지원하기</button>
      </div>
    </div>
  `;
  // Appended inside .od-app (not just body) so it inherits the page's
  // --od-* theme variables — see odEnsureDnaReportOverlay above for why.
  (document.querySelector('.od-app') || document.body).appendChild(overlay);

  const close = () => {
    overlay.style.display = 'none';
    odApplyModalSubmitHandler = null;
  };
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('#odApplyModalClose') || e.target.closest('#odApplyModalCancel')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display !== 'none') close();
  });
  document.getElementById('odApplyModalSubmit').addEventListener('click', () => {
    const message = document.getElementById('odApplyModalMessage').value.trim();
    const handler = odApplyModalSubmitHandler;
    close();
    if (handler) handler(message);
  });
  return overlay;
}

// subtitle: e.g. "'서울 야행수선단' · 비주얼 아티스트". onSubmit(message) fires
// once the user confirms — message is '' when left blank, never skipped.
function odOpenApplyForm(subtitle, onSubmit) {
  const overlay = odEnsureApplyModal();
  document.getElementById('odApplyModalSub').textContent = subtitle;
  document.getElementById('odApplyModalMessage').value = '';
  odApplyModalSubmitHandler = onSubmit;
  overlay.style.display = 'flex';
  document.getElementById('odApplyModalMessage').focus();
}

const odCardsContainer = document.querySelector('.od-cards');
if (odCardsContainer) {
  odCardsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-dna-report]');
    if (!btn) return;
    const id = btn.dataset.dnaReport;
    const ip = (typeof bearipLoadIPs === 'function' ? bearipLoadIPs() : []).find((i) => i.id === id);
    if (!ip) return;
    bearipEnsureDnaBreakdown(ip);
    odOpenDnaReport(ip.title || '제목 없는 IP', ip.dnaBreakdown, ip.dnaScore);
  });
}

// Sort dropdown — reorders real .od-card elements by real per-card data
// attributes (set in open-dna-published.js for each published card).
const odSortSelect = document.getElementById('odSortSelect');
if (odSortSelect) {
  const OD_SORTERS = {
    latest: (a, b) => (b.dataset.created || '').localeCompare(a.dataset.created || ''),
    popular: (a, b) => (parseInt(b.dataset.followers, 10) || 0) - (parseInt(a.dataset.followers, 10) || 0),
    dna: (a, b) => (parseInt(b.dataset.dna, 10) || 0) - (parseInt(a.dataset.dna, 10) || 0),
    recruiting: (a, b) => (parseInt(b.dataset.recruiting, 10) || 0) - (parseInt(a.dataset.recruiting, 10) || 0),
  };
  odSortSelect.addEventListener('change', () => {
    const container = document.querySelector('.od-cards');
    const sorter = OD_SORTERS[odSortSelect.value];
    if (!container || !sorter) return;
    const cards = [...container.querySelectorAll('.od-card')].sort(sorter);
    const mocks = [...container.querySelectorAll('.mock-slot')];
    cards.forEach((c) => container.appendChild(c));
    mocks.forEach((m) => container.appendChild(m));
  });
}
