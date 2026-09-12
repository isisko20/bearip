// Injects real published IPs (visibility === 'public') into CONTENT ROOM's
// 라이징/챌린지/오피셜 rows (clearing each row's "아직 콘텐츠가 없어요"
// placeholder the first time it gets a real card) and features the most
// engaged one in the hero — using the same growth stage (bearipGrowthStage,
// storage.js) that drives OPEN DNA's badges, so "how developed is this IP"
// means the same thing on both pages. SEED-stage IPs don't appear here yet;
// there's nothing worth watching or reading that early. This connects at
// the IP level (not per-episode) — clicking a card goes to ip-detail.html
// via the same one-shot sessionStorage flag open-dna-published.js already
// uses.
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
  const coverUrl = ip.coverImage || (imageAsset && imageAsset.imageData);
  const style = coverUrl
    ? ` style="background-image:url('${coverUrl}');background-size:cover;background-position:center"`
    : '';
  const className = coverUrl ? '' : `cr-thumb-${(index % 10) + 1}`;
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

  // Clears a track's "아직 콘텐츠가 없어요" placeholder the first time a
  // real card is about to be inserted into it.
  function clearRowEmpty(track) {
    const empty = track.querySelector('.cr-row-empty');
    if (empty) empty.remove();
  }

  entries.forEach(({ ip, stage }, i) => {
    if (stage === 'seed') return;
    const track = document.querySelector(`.cr-row.${stage} .cr-carousel-track`);
    if (!track) return;
    clearRowEmpty(track);

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
    track.appendChild(card);
  });

  const rankTrack = document.querySelector('.cr-row.top100 .cr-carousel-track');
  if (!rankTrack) return;
  const ranked = entries
    .filter((e) => e.stage === 'challenge' || e.stage === 'official')
    .sort((a, b) => ((b.ip.views || 0) + (b.ip.likes || 0)) - ((a.ip.views || 0) + (a.ip.likes || 0)));

  if (ranked.length) clearRowEmpty(rankTrack);
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
    rankTrack.appendChild(card);
  });

  // Hero — features the single most-engaged (views + likes) real published
  // IP above seed stage, if one exists. Otherwise the static "아직
  // 대표작이 없어요" placeholder in the HTML stays as-is.
  const heroCandidates = entries.filter((e) => e.stage !== 'seed').sort(
    (a, b) => ((b.ip.views || 0) + (b.ip.likes || 0)) - ((a.ip.views || 0) + (a.ip.likes || 0))
  );
  if (heroCandidates.length) {
    const { ip, stage } = heroCandidates[0];
    const imageAsset = (ip.assets || []).find((a) => a.imageData);
    const coverUrl = ip.coverImage || (imageAsset && imageAsset.imageData);
    const heroBg = document.getElementById('crHeroBg');
    if (heroBg) {
      heroBg.style.position = 'absolute';
      heroBg.style.inset = '0';
      if (coverUrl) {
        heroBg.className = 'cr-hero-bg';
        heroBg.style.backgroundImage = `url('${coverUrl}')`;
        heroBg.style.backgroundSize = 'cover';
        heroBg.style.backgroundPosition = 'center';
      } else {
        heroBg.className = `cr-hero-bg cr-thumb-${(ip.id.length % 10) + 1}`;
      }
    }
    const badgeText = document.getElementById('crHeroBadgeText');
    if (badgeText) badgeText.textContent = `${BEARIP_STAGE_LABELS[stage]} · 오늘의 추천`;
    const titleEl = document.getElementById('crHeroTitle');
    if (titleEl) titleEl.textContent = ip.title || '제목 없는 IP';
    const descEl = document.getElementById('crHeroDesc');
    if (descEl) descEl.textContent = ip.logline || ip.synopsis || '아직 소개가 없어요.';
    const actions = document.getElementById('crHeroActions');
    if (actions) actions.hidden = false;
    const infoBtn = document.getElementById('crHeroInfoBtn');
    if (infoBtn) infoBtn.addEventListener('click', () => crGoToIp(ip));
    // No real per-episode content exists yet (content-detail.html is a
    // static mockup, not wired to any real IP), so the hero only offers the
    // one action that's genuinely real: the IP's own detail page.
    const playBtn = document.getElementById('crHeroPlayBtn');
    if (playBtn) playBtn.remove();
  }
});
