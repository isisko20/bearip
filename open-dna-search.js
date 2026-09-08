// OPEN DNA text search — filters the .od-cards grid (real published IPs
// injected by open-dna-published.js plus the static demo cards) by whatever
// text is on the card. Mirrors crew-match-filter.js's search pattern.
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('odSearchInput');
  const grid = document.getElementById('odCardsGrid');
  const emptyEl = document.getElementById('odCardsEmpty');
  if (!input || !grid) return;

  function textOf(el) {
    return el.textContent.trim().toLowerCase();
  }

  function applySearch() {
    const query = input.value.trim().toLowerCase();

    let visibleCards = 0;
    grid.querySelectorAll('.od-card').forEach((card) => {
      const show = !query || textOf(card).includes(query);
      // Not the `hidden` attribute — .od-card has its own `display: flex`
      // class rule that would beat the UA [hidden] rule at equal specificity.
      card.style.display = show ? '' : 'none';
      if (show) visibleCards += 1;
    });

    // Mock selection slots aren't real searchable content — hide them
    // whenever a search is active instead of showing meaningless "results".
    grid.querySelectorAll('.mock-slot').forEach((slot) => {
      slot.style.display = query ? 'none' : '';
    });

    if (emptyEl) emptyEl.hidden = !query || visibleCards > 0;
  }

  input.addEventListener('input', applySearch);
});
