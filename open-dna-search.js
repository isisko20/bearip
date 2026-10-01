// OPEN DNA filtering — text search + 카테고리 탭(웹소설/웹툰/영상/멀티포맷),
// applied together to the .od-cards grid (real published IPs injected by
// open-dna-published.js). Categories match each IP's own `goal` field
// (card.dataset.goal). Mirrors crew-match-filter.js's search pattern.
let odActiveGoal = 'all';

function odApplyFilters() {
  const input = document.getElementById('odSearchInput');
  const grid = document.getElementById('odCardsGrid');
  const emptyEl = document.getElementById('odCardsEmpty');
  if (!grid) return;

  const query = input ? input.value.trim().toLowerCase() : '';
  const filtering = !!query || odActiveGoal !== 'all';

  let visibleCards = 0;
  grid.querySelectorAll('.od-card').forEach((card) => {
    const matchesText = !query || card.textContent.trim().toLowerCase().includes(query);
    const matchesGoal = odActiveGoal === 'all' || card.dataset.goal === odActiveGoal;
    const show = matchesText && matchesGoal;
    // Not the `hidden` attribute — .od-card has its own `display: flex`
    // class rule that would beat the UA [hidden] rule at equal specificity.
    card.style.display = show ? '' : 'none';
    if (show) visibleCards += 1;
  });

  // Mock selection slots aren't real filterable content — hide them
  // whenever any filter is active instead of showing meaningless "results".
  grid.querySelectorAll('.mock-slot').forEach((slot) => {
    slot.style.display = filtering ? 'none' : '';
  });

  if (emptyEl) {
    emptyEl.hidden = visibleCards > 0;
    emptyEl.textContent = filtering ? '조건에 맞는 IP가 없어요.' : '아직 공개된 IP가 없어요.';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('odSearchInput');
  if (input) input.addEventListener('input', odApplyFilters);

  // open-dna.js already toggles the .active class on a clicked tab; this just
  // records which category it was and re-filters.
  document.querySelectorAll('#odCategoryTabs .od-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      odActiveGoal = tab.dataset.goal || 'all';
      odApplyFilters();
    });
  });

  // A search typed into another page's header (auth-ui.js's bearipSearchGo)
  // arrives here as a one-shot sessionStorage value, same handoff pattern
  // the rest of the app uses instead of a query string.
  const incomingQuery = sessionStorage.getItem('bearip_open_dna_query');
  sessionStorage.removeItem('bearip_open_dna_query');
  if (incomingQuery && input) input.value = incomingQuery;

  // Runs once on load too (not just on the next click/keystroke) so the empty
  // state is correct even before any filter — nothing to show fake demo
  // cards for anymore when there are no real published IPs yet.
  odApplyFilters();
});
