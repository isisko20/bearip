// Renders IPs the user has published from MY DNA (ip.visibility === 'public')
// as real cards in the "지금 성장 중인 OPEN DNA" grid, ahead of the mock
// placeholder slots. "IP 보기" / "참여하기" pass the IP id to ip-detail.html
// via a one-shot sessionStorage flag, which ip-detail.js reads to rewrite
// the (otherwise static, demo-only) detail page for this IP.

const OD_GOAL_TAG = { webnovel: 'WEBNOVEL', webtoon: 'WEBTOON', video: 'VIDEO', multi: 'MULTI' };

function odBuildPublishedCard(ip, index) {
  const esc = typeof bearipEscapeHtml === 'function' ? bearipEscapeHtml : (s) => s;
  const imageAsset = (ip.assets || []).find((a) => a.imageData);
  const bannerStyle = imageAsset
    ? ` style="background-image:url('${imageAsset.imageData}');background-size:cover;background-position:center"`
    : '';
  const bannerClass = imageAsset ? '' : `thumb-${(index % 8) + 1}`;
  const avatarThumb = `thumb-${((index + 3) % 8) + 1}`;
  const initials = esc(ip.title || 'IP').slice(0, 6);

  const bylineParts = [];
  if (ip.genres && ip.genres[0]) bylineParts.push(esc(ip.genres[0]));
  bylineParts.push('성장 중');
  const byline = bylineParts.join(' · ');

  const formatTag = OD_GOAL_TAG[ip.goal] || 'IP';
  const dna = ip.dnaScore || 0;
  const readiness = ip.readinessScore || 0;
  const production = ip.productionProgress || 0;

  const imageAssets = (ip.assets || []).filter((a) => a.imageData);
  let latestWorkHtml = '';
  if (imageAssets.length) {
    const thumbs = imageAssets
      .slice(0, 3)
      .map((a) => `<div class="od-latest-thumb" style="background-image:url('${a.imageData}');background-size:cover;background-position:center"></div>`)
      .join('');
    const more = imageAssets.length > 3 ? `<div class="od-latest-thumb od-latest-more">+${imageAssets.length - 3}</div>` : '';
    latestWorkHtml = `<div class="od-latest-label">Latest Work</div><div class="od-latest-row">${thumbs}${more}</div>`;
  }

  const isRecruiting = (typeof bearipLoadPositions === 'function' ? bearipLoadPositions() : []).some((p) => p.ipTitle === ip.title);

  const card = document.createElement('article');
  card.className = 'od-card';
  card.dataset.ipId = ip.id;
  card.dataset.created = (ip.createdAt || '').slice(0, 10) || '1970-01-01';
  card.dataset.dna = dna;
  card.dataset.followers = 0;
  card.dataset.recruiting = isRecruiting ? '1' : '0';
  card.innerHTML = `
    <div class="od-card-banner ${bannerClass}"${bannerStyle}>
      <span class="od-stage-badge rising">MY IP</span>
      <div class="od-card-avatar ${avatarThumb}">${initials}</div>
    </div>
    <div class="od-card-body">
      <div class="od-card-title-row">
        <h3>${esc(ip.title || '제목 없는 IP')}</h3>
        <button class="od-bookmark" aria-label="북마크" data-ip="${ip.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg></button>
      </div>
      <div class="od-card-byline">${byline}</div>
      <p class="od-card-tagline">${esc(ip.logline || '아직 로그라인이 없어요')}</p>
      <div class="od-format-tags"><span class="od-format-tag">${formatTag}</span></div>
      <div class="od-stat-row">
        <div class="od-stat"><div class="label">DNA</div><div class="value">${dna}%</div><div class="bar"><div class="bar-fill" style="width:${dna}%"></div></div></div>
        <div class="od-stat"><div class="label">준비도</div><div class="value">${readiness}%</div><div class="bar"><div class="bar-fill" style="width:${readiness}%"></div></div></div>
        <div class="od-stat"><div class="label">제작 진행</div><div class="value">${production}%</div><div class="bar"><div class="bar-fill" style="width:${production}%"></div></div></div>
      </div>
      ${latestWorkHtml}
      <div class="od-foot-stats">
        <div class="od-foot-stat"><span class="row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3.4"/><path d="M1.6 20c0-3.8 2.9-6.2 6.4-6.2S14.4 16.2 14.4 20"/><circle cx="17" cy="9" r="2.6"/><path d="M14.6 13.6c2.6.3 4.4 2.3 5.3 4.1"/></svg>0</span><span class="lbl">팔로워</span></div>
        <div class="od-foot-stat"><span class="row"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.5-9.5-9C.6 8.5 3 4.5 7 4.5c2.1 0 3.7 1.2 5 3 1.3-1.8 2.9-3 5-3 4 0 6.4 4 4.5 7.5C19 16.5 12 21 12 21z"/></svg>0</span><span class="lbl">응원</span></div>
        <div class="od-foot-stat"><span class="row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 01-8.9 8.4 8.6 8.6 0 01-3.8-.9L3 20l1.1-5A8.4 8.4 0 1121 11.5z"/></svg>0</span><span class="lbl">활동</span></div>
      </div>
      <div class="od-card-actions">
        <button class="od-btn-outline" data-view-ip="${ip.id}">IP 보기</button>
        <button class="od-btn-solid" data-view-ip="${ip.id}">참여하기</button>
      </div>
    </div>
  `;
  return card;
}

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.od-cards');
  if (!container || typeof bearipLoadIPs !== 'function') return;

  const publicIPs = bearipLoadIPs().filter((ip) => ip.visibility === 'public');
  if (!publicIPs.length) return;

  const firstMock = container.querySelector('.mock-slot');
  publicIPs.forEach((ip, i) => {
    const card = odBuildPublishedCard(ip, i);
    if (firstMock) container.insertBefore(card, firstMock);
    else container.appendChild(card);
    card.querySelectorAll('.od-bookmark').forEach(odWireBookmarkButton);
    card.querySelectorAll('[data-view-ip]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sessionStorage.setItem('bearip_view_ip_id', btn.dataset.viewIp);
        location.href = 'ip-detail.html';
      });
    });
  });
});
