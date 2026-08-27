// Keyboard accessibility: allow Enter/Space to activate portal cards, and
// give a small press feedback so the choice feels tactile.
document.querySelectorAll('.portal-card').forEach((card) => {
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      card.click();
    }
  });
});
