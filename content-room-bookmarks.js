// CONTENT ROOM's 북마크 row — content-detail.html's 북마크 button (CD_BOOKMARK_KEY)
// only ever wrote to a local id set with nowhere to look it back up; this
// renders that set as real cards (bearipMyBookmarkedEpisodes, storage.js)
// so bookmarking an episode actually leads somewhere. Per-episode, unlike
// every other row here (content-room-published.js, IP-level) — clicking a
// card hands off both the IP snapshot and the episode id, same pattern
// content-room-published.js's hero 재생 button already uses.

function crbGoToEpisode(ip, episode) {
  sessionStorage.setItem('bearip_view_ip_snapshot', JSON.stringify(ip));
  sessionStorage.setItem('bearip_view_episode_id', episode.id);
  location.href = 'content-detail.html';
}

function crbRenderBookmarks() {
  const track = document.querySelector('.cr-row.bookmark .cr-carousel-track');
  if (!track || typeof bearipMyBookmarkedEpisodes !== 'function') return;

  track.querySelectorAll('.cr-card[data-bookmark="1"]').forEach((el) => el.remove());
  const empty = track.querySelector('.cr-row-empty:not(.cr-search-empty)');

  const entries = bearipMyBookmarkedEpisodes();
  if (empty) empty.style.display = entries.length ? 'none' : '';

  const esc = typeof bearipEscapeHtml === 'function' ? bearipEscapeHtml : (s) => s;
  entries.forEach(({ ip, episode }, i) => {
    const style = episode.imageData
      ? ` style="background-image:url('${episode.imageData}');background-size:cover;background-position:center"`
      : '';
    const className = episode.imageData ? '' : `cr-thumb-${(i % 10) + 1}`;
    const card = document.createElement('article');
    card.className = 'cr-card';
    card.dataset.bookmark = '1';
    card.innerHTML = `
      <div class="poster ${className}"${style}>
        <div class="cr-play-overlay"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
      </div>
      <div class="title">${esc(episode.title || '제목 없는 회차')}</div>
      <div class="meta">${esc(ip.title || '제목 없는 IP')}</div>
    `;
    card.addEventListener('click', () => crbGoToEpisode(ip, episode));
    track.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  crbRenderBookmarks();
  if (typeof bearipOnDataChange === 'function') {
    bearipOnDataChange('publicIPs', crbRenderBookmarks);
    bearipOnDataChange('allIPs', crbRenderBookmarks);
  }
});
