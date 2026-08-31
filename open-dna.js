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

// Sort dropdown — reorders real .od-card elements by real per-card data
// attributes (set in the HTML for the demo card, and in
// open-dna-published.js for user-published cards). .mock-slot placeholders
// have no real data to sort by, so they always stay pinned at the end.
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
