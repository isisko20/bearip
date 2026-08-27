// Category tab switching (visual only)
document.querySelectorAll('.od-tabs .od-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.od-tabs .od-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
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
