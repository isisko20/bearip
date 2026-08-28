// CREW MATCH: role-tab filtering, text search, and position sorting.
// Runs alongside open-dna.js's generic .od-tab active-class toggling.

document.addEventListener('DOMContentLoaded', () => {
  const roleTabs = document.getElementById('cmRoleTabs');
  const searchInput = document.getElementById('cmSearchInput');
  const sortSelect = document.getElementById('cmSortSelect');
  const positionsList = document.getElementById('positionsList');
  const creatorsList = document.querySelector('.cm-creators');
  if (!roleTabs || !positionsList) return;

  let currentRole = 'all';

  function textOf(el) {
    return el.textContent.trim().toLowerCase();
  }

  function applyFilter() {
    const query = searchInput.value.trim().toLowerCase();
    // Set display directly rather than the `hidden` attribute — these cards
    // have their own `.cm-position-card { display: flex }` rule, which beats
    // the UA [hidden] stylesheet rule at equal specificity, so `hidden` alone
    // wouldn't actually hide them.
    let visiblePositions = 0;
    positionsList.querySelectorAll('.cm-position-card').forEach((card) => {
      const roleMatch = currentRole === 'all' || card.dataset.role === currentRole;
      const textMatch = !query || textOf(card).includes(query);
      const show = roleMatch && textMatch;
      card.style.display = show ? '' : 'none';
      if (show) visiblePositions += 1;
    });
    document.getElementById('positionsEmpty').hidden = visiblePositions > 0;

    if (creatorsList) {
      let visibleCreators = 0;
      creatorsList.querySelectorAll('.cm-creator-card').forEach((card) => {
        const roleMatch = currentRole === 'all' || card.dataset.role === currentRole;
        const textMatch = !query || textOf(card).includes(query);
        const show = roleMatch && textMatch;
        card.style.display = show ? '' : 'none';
        if (show) visibleCreators += 1;
      });
      document.getElementById('creatorsEmpty').hidden = visibleCreators > 0;
    }
  }

  function applySort() {
    const mode = sortSelect.value;
    const cards = Array.from(positionsList.querySelectorAll('.cm-position-card'));
    cards.sort((a, b) => {
      if (mode === 'deadline') return a.dataset.deadline.localeCompare(b.dataset.deadline);
      if (mode === 'fewest') return Number(a.dataset.remaining) - Number(b.dataset.remaining);
      return 0; // "최신순" — keep original document order
    });
    if (mode === 'latest') return; // nothing to reorder
    cards.forEach((card) => positionsList.appendChild(card));
  }

  roleTabs.querySelectorAll('.od-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      currentRole = tab.dataset.role;
      applyFilter();
    });
  });

  searchInput.addEventListener('input', applyFilter);
  sortSelect.addEventListener('change', applySort);

  // Arriving from a "Creator 찾기" link elsewhere (e.g. MY DNA) pre-selects
  // the matching role tab.
  const incomingRole = sessionStorage.getItem('bearip_cm_role_filter');
  if (incomingRole) {
    sessionStorage.removeItem('bearip_cm_role_filter');
    const tab = roleTabs.querySelector(`.od-tab[data-role="${incomingRole}"]`);
    if (tab) tab.click();
  }
});
