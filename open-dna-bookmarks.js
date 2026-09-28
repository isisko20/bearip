// OPEN DNA's 북마크한 IP section — open-dna.js's 북마크 button
// (OD_BOOKMARK_KEY) only ever wrote to a local id set with nowhere to look
// it back up, same gap content-room-bookmarks.js already fixed for episode
// bookmarks. Reuses open-dna-published.js's own card builder so a bookmarked
// card looks and behaves exactly like its counterpart in the main grid.

function odbRenderBookmarks() {
  const grid = document.getElementById('odBookmarkedGrid');
  const empty = document.getElementById('odBookmarkedEmpty');
  if (!grid || typeof bearipMyBookmarkedIps !== 'function' || typeof odBuildPublishedCard !== 'function') return;

  grid.querySelectorAll('.od-card').forEach((el) => el.remove());

  const ips = bearipMyBookmarkedIps();
  if (empty) empty.hidden = ips.length > 0;

  ips.forEach((ip, i) => {
    const card = odBuildPublishedCard(ip, i);
    grid.appendChild(card);
    card.querySelectorAll('.od-bookmark').forEach(odWireBookmarkButton);
    card.querySelectorAll('[data-view-ip]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sessionStorage.setItem('bearip_view_ip_snapshot', JSON.stringify(ip));
        location.href = 'ip-detail.html';
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  odbRenderBookmarks();
  if (typeof bearipOnDataChange === 'function') {
    bearipOnDataChange('publicIPs', odbRenderBookmarks);
    bearipOnDataChange('allIPs', odbRenderBookmarks);
  }
});
