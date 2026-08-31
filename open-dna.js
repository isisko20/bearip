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
