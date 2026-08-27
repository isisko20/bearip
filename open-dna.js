// Category tab switching (visual only) — scoped per .od-tabs group so a page
// with more than one tab bar (e.g. role filter + page tabs) doesn't cross-toggle.
document.querySelectorAll('.od-tabs').forEach((group) => {
  group.querySelectorAll('.od-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      group.querySelectorAll('.od-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
});

// Bookmark toggle
document.querySelectorAll('.od-bookmark').forEach((btn) => {
  btn.addEventListener('click', () => {
    const svg = btn.querySelector('svg');
    const filled = svg.getAttribute('fill') === 'currentColor';
    svg.setAttribute('fill', filled ? 'none' : 'currentColor');
    btn.style.color = filled ? 'var(--od-ink-soft)' : 'var(--od-purple)';
  });
});
