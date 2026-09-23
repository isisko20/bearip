// Injects every publicly published IP (from Firebase — see
// bearipLoadPublicIPs in storage.js) into CONTENT ROOM's 라이징/챌린지/오피셜
// rows (clearing each row's "아직 콘텐츠가 없어요" placeholder the first time
// it gets a real card) and features the most engaged one in the hero — using
// the same growth stage (bearipGrowthStage, storage.js) that drives OPEN
// DNA's badges, so "how developed is this IP" means the same thing on both
// pages. SEED-stage IPs don't appear here yet; there's nothing worth
// watching or reading that early. This connects at the IP level (not
// per-episode) — clicking a card goes to ip-detail.html via the same
// one-shot sessionStorage flag open-dna-published.js already uses, carrying
// the full IP snapshot since a published IP may not exist in this visitor's
// own local storage at all.
//
// 조회수/좋아요 are real per-IP counts (ip.views/ip.likes, updated from
// ip-detail.js — only for IPs the viewer actually owns locally, see there),
// not placeholders — so is the TOP 100 row below, ranked by combined
// engagement across CHALLENGE + OFFICIAL tier content only, matching that
// row's own "챌린지 + 오피셜 콘텐츠를 합산한" description.
//
// Re-rendered whenever the published list changes, not just on page load —
// see crRenderPublished's own DOMContentLoaded wiring at the bottom.

function crGoToIp(ip) {
  sessionStorage.setItem('bearip_view_ip_snapshot', JSON.stringify(ip));
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

function crRenderPublished() {
  if (typeof bearipLoadBrowsableIPs !== 'function') return;

  // Clear anything a previous run of this function inserted, so a live
  // update (someone publishing/unpublishing while this page is open)
  // redraws instead of piling up duplicate cards.
  document.querySelectorAll('.cr-card[data-published="1"], .cr-rank-card[data-published="1"]').forEach((el) => el.remove());

  // Every IP regardless of publish status when GM is logged in (제작
  // 시뮬레이션) — see bearipLoadBrowsableIPs in storage.js.
  const publicIPs = bearipLoadBrowsableIPs();
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
    card.dataset.published = '1';
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
    card.dataset.published = '1';
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
    // Not the `hidden` attribute — .cr-hero-actions sets `display: flex`
    // unconditionally, which wins over the UA's `[hidden]` rule regardless
    // of specificity, so the buttons would show even with no real hero IP.
    const actions = document.getElementById('crHeroActions');
    if (actions) actions.style.display = 'flex';
    const infoBtn = document.getElementById('crHeroInfoBtn');
    if (infoBtn) infoBtn.addEventListener('click', () => crGoToIp(ip));
    // 재생 only makes sense once this IP actually has a readable episode
    // (my-dna-episodes.js) — style.display, not .remove(), since this whole
    // block re-runs on every publicIPs/allIPs change and a first episode
    // could show up after the empty-state render already ran once.
    const playBtn = document.getElementById('crHeroPlayBtn');
    if (playBtn) {
      const firstEpisode = (ip.episodes || [])[0];
      if (firstEpisode) {
        playBtn.style.display = '';
        playBtn.onclick = () => {
          sessionStorage.setItem('bearip_view_ip_snapshot', JSON.stringify(ip));
          sessionStorage.setItem('bearip_view_episode_id', firstEpisode.id);
          location.href = 'content-detail.html';
        };
      } else {
        playBtn.style.display = 'none';
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  crRenderPublished();
  if (typeof bearipOnDataChange === 'function') {
    bearipOnDataChange('publicIPs', crRenderPublished);
    bearipOnDataChange('allIPs', crRenderPublished);
  }
});
