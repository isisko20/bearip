// Injects real published IPs (visibility === 'public') into CONTENT ROOM's
// 라이징/챌린지/오피셜 rows, ahead of the mock placeholder cards — using the
// same growth stage (bearipGrowthStage, storage.js) that drives OPEN DNA's
// badges, so "how developed is this IP" means the same thing on both pages.
// SEED-stage IPs don't appear here yet; there's nothing worth watching or
// reading that early. This connects at the IP level (not per-episode) —
// clicking a card goes to ip-detail.html via the same one-shot
// sessionStorage flag open-dna-published.js already uses.
//
// 조회수/좋아요 are real per-IP counts (ip.views/ip.likes, updated from
// ip-detail.js), not placeholders — so is the TOP 100 row below, ranked by
// combined engagement across CHALLENGE + OFFICIAL tier content only,
// matching that row's own "챌린지 + 오피셜 콘텐츠를 합산한" description.

function crGoToIp(ip) {
  sessionStorage.setItem('bearip_view_ip_id', ip.id);
  location.href = 'ip-detail.html';
}

function crPosterAttrs(ip, index) {
  const imageAsset = (ip.assets || []).find((a) => a.imageData);
  const style = imageAsset
    ? ` style="background-image:url('${imageAsset.imageData}');background-size:cover;background-position:center"`
    : '';
  const className = imageAsset ? '' : `cr-thumb-${(index % 10) + 1}`;
  return { style, className };
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof bearipLoadIPs !== 'function') return;
  const publicIPs = bearipLoadIPs().filter((ip) => ip.visibility === 'public');
  if (!publicIPs.length) return;

  const esc = typeof bearipEscapeHtml === 'function' ? bearipEscapeHtml : (s) => s;
  const entries = publicIPs.map((ip) => {
    bearipEnsureDnaBreakdown(ip);
    return { ip, stage: bearipGrowthStage(ip.dnaScore || 0) };
  });

  entries.forEach(({ ip, stage }, i) => {
    if (stage === 'seed') return;
    const track = document.querySelector(`.cr-row.${stage} .cr-carousel-track`);
    if (!track) return;

    const { style, className } = crPosterAttrs(ip, i);
    const card = document.createElement('article');
    card.className = 'cr-card';
    card.innerHTML = `
      <div class="poster ${className}"${style}>
        <span class="cr-tier-badge ${stage}">${BEARIP_STAGE_LABELS[stage]}</span>
        <div class="cr-play-overlay"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
      </div>
      <div class="title">${esc(ip.title || '제목 없는 IP')}</div>
      <div class="meta">조회수 ${bearipFormatCount(ip.views)} · 좋아요 ${bearipFormatCount(ip.likes)}</div>
    `;
    card.addEventListener('click', () => crGoToIp(ip));

    const firstMock = track.querySelector('.cr-mock-card');
    if (firstMock) track.insertBefore(card, firstMock);
    else track.appendChild(card);
  });

  const rankTrack = document.querySelector('.cr-row.top100 .cr-carousel-track');
  if (!rankTrack) return;
  const ranked = entries
    .filter((e) => e.stage === 'challenge' || e.stage === 'official')
    .sort((a, b) => ((b.ip.views || 0) + (b.ip.likes || 0)) - ((a.ip.views || 0) + (a.ip.likes || 0)));

  ranked.forEach(({ ip, stage }, i) => {
    const { style, className } = crPosterAttrs(ip, i);
    const card = document.createElement('article');
    card.className = 'cr-rank-card';
    card.innerHTML = `
      <div class="cr-rank-num">${i + 1}</div>
      <div class="cr-rank-poster-wrap">
        <div class="poster ${className}"${style}><span class="cr-tier-badge ${stage}">${BEARIP_STAGE_LABELS[stage]}</span></div>
        <div class="title">${esc(ip.title || '제목 없는 IP')}</div>
        <div class="meta">조회수 ${bearipFormatCount(ip.views)} · 좋아요 ${bearipFormatCount(ip.likes)}</div>
      </div>
    `;
    card.addEventListener('click', () => crGoToIp(ip));

    const firstMock = rankTrack.querySelector('.cr-mock-rank');
    if (firstMock) rankTrack.insertBefore(card, firstMock);
    else rankTrack.appendChild(card);
  });
});
