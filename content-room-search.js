// Content Room text search — was a decorative input with no id and no
// listener anywhere; typing in it and pressing enter did nothing. Filters
// every row's real cards (content-room-published.js) by whatever text is on
// the card, same pattern open-dna-search.js already uses for OPEN DNA.
// Covers all four rows (라이징/챌린지/오피셜) plus TOP 100's rank cards, since
// they all share the same .cr-carousel-track container shape.
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('crSearchInput');
  if (!input) return;

  function textOf(el) {
    return el.textContent.trim().toLowerCase();
  }

  // A track's own "아직 콘텐츠가 없어요" placeholder (content-room-published.js)
  // is removed the moment a real card lands in that row and never comes
  // back — so a search that filters every real card down to zero needs its
  // own message, created on demand and just hidden/shown after that.
  function ensureSearchEmpty(track) {
    let el = track.querySelector('.cr-search-empty');
    if (!el) {
      el = document.createElement('div');
      el.className = 'cr-row-empty cr-search-empty';
      el.textContent = '검색 결과가 없어요.';
      track.appendChild(el);
    }
    return el;
  }

  function applySearch() {
    const query = input.value.trim().toLowerCase();
    document.querySelectorAll('.cr-carousel-track').forEach((track) => {
      const cards = track.querySelectorAll('.cr-card, .cr-rank-card');
      let visible = 0;
      cards.forEach((card) => {
        const show = !query || textOf(card).includes(query);
        card.style.display = show ? '' : 'none';
        if (show) visible += 1;
      });
      const searchEmpty = track.querySelector('.cr-search-empty');
      if (query && cards.length && visible === 0) {
        ensureSearchEmpty(track).style.display = '';
      } else if (searchEmpty) {
        searchEmpty.style.display = 'none';
      }
    });
  }

  input.addEventListener('input', applySearch);
  // Re-applies after content-room-published.js rebuilds cards from a live
  // data change — that rebuild would otherwise silently drop the filter
  // (fresh cards it appends start out fully visible again).
  if (typeof bearipOnDataChange === 'function') {
    bearipOnDataChange('publicIPs', applySearch);
    bearipOnDataChange('allIPs', applySearch);
  }

  // Arriving from content-detail.html's own header search (?q=...) —
  // pre-fill and apply it here instead of that page trying to filter a
  // single-episode view.
  const params = new URLSearchParams(location.search);
  const incomingQuery = params.get('q');
  if (incomingQuery) {
    input.value = incomingQuery;
    applySearch();
  }
});
