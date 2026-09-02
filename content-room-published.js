// Injects real published IPs (visibility === 'public') into CONTENT ROOM's
// 라이징/챌린지/오피셜 rows, ahead of the mock placeholder cards — using the
// same growth stage (bearipGrowthStage, storage.js) that drives OPEN DNA's
// badges, so "how developed is this IP" means the same thing on both pages.
// SEED-stage IPs don't appear here yet; there's nothing worth watching or
// reading that early. This connects at the IP level (not per-episode) —
// clicking a card goes to ip-detail.html via the same one-shot
// sessionStorage flag open-dna-published.js already uses.

document.addEventListener('DOMContentLoaded', () => {
  if (typeof bearipLoadIPs !== 'function') return;
  const publicIPs = bearipLoadIPs().filter((ip) => ip.visibility === 'public');
  if (!publicIPs.length) return;

  const esc = typeof bearipEscapeHtml === 'function' ? bearipEscapeHtml : (s) => s;

  publicIPs.forEach((ip, i) => {
    if (typeof bearipEnsureDnaBreakdown === 'function') bearipEnsureDnaBreakdown(ip);
    const stage = bearipGrowthStage(ip.dnaScore || 0);
    if (stage === 'seed') return;

    const track = document.querySelector(`.cr-row.${stage} .cr-carousel-track`);
    if (!track) return;

    const imageAsset = (ip.assets || []).find((a) => a.imageData);
    const posterStyle = imageAsset
      ? ` style="background-image:url('${imageAsset.imageData}');background-size:cover;background-position:center"`
      : '';
    const posterClass = imageAsset ? '' : `cr-thumb-${(i % 10) + 1}`;

    const card = document.createElement('article');
    card.className = 'cr-card';
    card.innerHTML = `
      <div class="poster ${posterClass}"${posterStyle}>
        <span class="cr-tier-badge ${stage}">${BEARIP_STAGE_LABELS[stage]}</span>
        <div class="cr-play-overlay"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
      </div>
      <div class="title">${esc(ip.title || '제목 없는 IP')}</div>
      <div class="meta">조회수 0 · 좋아요 0</div>
    `;
    card.addEventListener('click', () => {
      sessionStorage.setItem('bearip_view_ip_id', ip.id);
      location.href = 'ip-detail.html';
    });

    const firstMock = track.querySelector('.cr-mock-card');
    if (firstMock) track.insertBefore(card, firstMock);
    else track.appendChild(card);
  });
});
