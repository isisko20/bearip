// Renders every publicly published IP (ip.visibility === 'public') as real
// cards in the "지금 성장 중인 OPEN DNA" grid, ahead of the mock placeholder
// slots. These come from Firebase (bearipLoadPublicIPs, storage.js), not
// local storage — MY DNA's own IP data is otherwise local-only, so this is
// what actually lets a small friend group see each other's published work.
// "IP 보기" / "참여하기" pass the full IP snapshot (already in hand from the
// card data) to ip-detail.html via a one-shot sessionStorage flag, rather
// than just an id — avoids ip-detail.html having to re-fetch/await Firebase
// data itself on a fresh page load.

const OD_GOAL_TAG = { webnovel: 'WEBNOVEL', webtoon: 'WEBTOON', video: 'VIDEO', multi: 'MULTI' };

function odBuildPublishedCard(ip, index) {
  const esc = typeof bearipEscapeHtml === 'function' ? bearipEscapeHtml : (s) => s;
  const imageAsset = (ip.assets || []).find((a) => a.imageData);
  const coverUrl = ip.coverImage || (imageAsset && imageAsset.imageData);
  const bannerStyle = coverUrl
    ? ` style="background-image:url('${coverUrl}');background-size:cover;background-position:center"`
    : '';
  const bannerClass = coverUrl ? '' : `thumb-${(index % 8) + 1}`;
  const initials = esc(ip.title || 'IP').slice(0, 6);

  const formatTag = OD_GOAL_TAG[ip.goal] || 'IP';
  if (typeof bearipEnsureDnaBreakdown === 'function') bearipEnsureDnaBreakdown(ip);
  const dna = ip.dnaScore || 0;
  const stage = bearipGrowthStage(dna);
  // 카드의 진행도는 띵킷 분석이에요. 분석하기를 누른 적이 없으면 퍼센트 대신 "분석 전"이에요.
  const analyzed = !!ip.analysisAt;
  const analysis = Math.max(0, Math.min(100, ip.readinessScore || 0));
  const stageLabel = BEARIP_STAGE_LABELS[stage];

  const isRecruiting = (typeof bearipLoadPositions === 'function' ? bearipLoadPositions() : []).some((p) =>
    p.ipId ? p.ipId === ip.id : p.ipTitle === ip.title
  );

  const card = document.createElement('article');
  card.className = 'od-card';
  card.dataset.ipId = ip.id;
  card.dataset.goal = ip.goal || '';
  card.dataset.created = (ip.createdAt || '').slice(0, 10) || '1970-01-01';
  card.dataset.dna = dna;
  const followerCount = typeof bearipFollowerCount === 'function' ? bearipFollowerCount(ip.id) : 0;
  card.dataset.followers = followerCount;
  card.dataset.popular =
    followerCount +
    (typeof bearipIpCheerCount === 'function' ? bearipIpCheerCount(ip.id) : 0) +
    (typeof bearipIpViewCount === 'function' ? bearipIpViewCount(ip.id) : 0);
  card.dataset.recruiting = isRecruiting ? '1' : '0';
  // 카드에는 이름·단계·진행도·썸네일만 보여주지만, 검색은 소개글·장르·형식까지 계속 찾아요.
  card.dataset.search = [ip.title, ip.logline, (ip.genres || []).join(' '), formatTag, stageLabel].join(' ').toLowerCase();
  card.dataset.viewIp = ip.id;
  card.tabIndex = 0;
  card.setAttribute('role', 'link');
  card.setAttribute('aria-label', `${ip.title || '제목 없는 IP'} 보기`);
  card.innerHTML = `
    <div class="od-card-banner ${bannerClass}"${bannerStyle}>
      ${coverUrl ? '' : `<span class="od-card-initials">${initials}</span>`}
      <span class="od-stage-badge ${stage}">${stageLabel}</span>
      ${isRecruiting ? '<span class="od-recruit-pill">모집 중</span>' : ''}
      <button class="od-bookmark" aria-label="북마크" data-ip="${ip.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg></button>
    </div>
    <div class="od-card-body">
      <h3 class="od-card-name">${esc(ip.title || '제목 없는 IP')}</h3>
      <div class="od-analysis${analyzed ? '' : ' pending'}" aria-label="띵킷 분석 ${analyzed ? analysis + '%' : '분석 전'}">
        <span class="od-analysis-label">띵킷 분석</span>
        <span class="od-analysis-value">${analyzed ? analysis + '%' : '분석 전'}</span>
        <span class="od-analysis-bar"><span class="od-analysis-fill" style="width:${analyzed ? analysis : 0}%"></span></span>
      </div>
    </div>
  `;
  return card;
}

// 카드 어디를 눌러도 IP 상세로 가요 (북마크·진행도 버튼은 제외). 전체 스냅샷을 같이 넘겨요 —
// 이 IP가 보는 사람의 로컬에는 없을 수 있어서 ip-detail.html이 스스로 찾을 수 없어요.
function odWireCardOpen(card, ip) {
  const open = () => {
    sessionStorage.setItem('bearip_view_ip_snapshot', JSON.stringify(ip));
    location.href = 'ip-detail.html';
  };
  card.addEventListener('click', (e) => {
    if (e.target.closest('.od-bookmark, [data-dna-report]')) return;
    open();
  });
  card.addEventListener('keydown', (e) => {
    if (e.target !== card || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    open();
  });
}

// Hero stat line — real counts, not fabricated platform numbers: how many
// IPs are actually public right now (or, for GM, how many exist at all —
// see bearipLoadBrowsableIPs), and how many are actively recruiting.
function odRenderHeroStats() {
  const statsEl = document.getElementById('odHeroStats');
  if (!statsEl) return;
  const publicCount = typeof bearipLoadBrowsableIPs === 'function' ? bearipLoadBrowsableIPs().length : 0;
  const recruitingCount = typeof bearipLoadPositions === 'function' ? bearipLoadPositions().length : 0;
  statsEl.innerHTML = `
    <span class="stat">공개된 IP <b>${publicCount}</b>개</span>
    <span class="stat">지금 모집 중 <b>${recruitingCount}</b>건</span>
  `;
}

// Hero CTA — routes straight to publishing: no real IP yet gets an honest
// nudge to create one first, an existing one goes to MY DNA where the actual
// OPEN DNA에 공개하기 toggle lives (this button doesn't publish by itself).
function odWireHeroPublishBtn() {
  const btn = document.getElementById('odHeroPublishBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const ips = typeof bearipLoadIPs === 'function' ? bearipLoadIPs() : [];
    if (!ips.length) {
      bearipShowToast('아직 만든 IP가 없어요. 먼저 상상력을 만들어보세요!');
      return;
    }
    if (!bearipRequireLogin('my-dna.html')) return;
    location.href = 'my-dna.html';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  odRenderHeroStats();
  if (typeof bearipOnDataChange === 'function') {
    bearipOnDataChange('publicIPs', odRenderHeroStats);
    bearipOnDataChange('allIPs', odRenderHeroStats);
    bearipOnDataChange('positions', odRenderHeroStats);
  }
});
document.addEventListener('DOMContentLoaded', odWireHeroPublishBtn);

// Re-runnable so a live change from Firebase (someone else publishing,
// unpublishing, or editing a public IP) redraws the grid without a reload —
// previously-rendered cards are cleared first (tagged via data-published)
// since bearipLoadBrowsableIPs() is re-read fresh each time. Shows every IP
// (not just published ones) when GM is logged in — see
// bearipLoadBrowsableIPs in storage.js — for 제작 시뮬레이션.
function odRenderPublishedCards() {
  const container = document.querySelector('.od-cards');
  if (!container || typeof bearipLoadBrowsableIPs !== 'function') return;

  container.querySelectorAll('.od-card[data-published="1"]').forEach((el) => el.remove());

  const publicIPs = bearipLoadBrowsableIPs();
  if (!publicIPs.length) {
    if (typeof odApplyFilters === 'function') odApplyFilters();
    return;
  }

  const firstMock = container.querySelector('.mock-slot');
  publicIPs.forEach((ip, i) => {
    const card = odBuildPublishedCard(ip, i);
    card.dataset.published = '1';
    if (firstMock) container.insertBefore(card, firstMock);
    else container.appendChild(card);
    card.querySelectorAll('.od-bookmark').forEach(odWireBookmarkButton);
    odWireCardOpen(card, ip);
  });
  // Cards were just rebuilt from scratch — reapply whatever 정렬 and 카테고리/
  // 검색 filter is active instead of silently resetting them on every live
  // update.
  if (typeof odApplySort === 'function') odApplySort();
  if (typeof odApplyFilters === 'function') odApplyFilters();
}

document.addEventListener('DOMContentLoaded', () => {
  odRenderPublishedCards();
  if (typeof bearipOnDataChange === 'function') {
    bearipOnDataChange('publicIPs', odRenderPublishedCards);
    bearipOnDataChange('allIPs', odRenderPublishedCards);
    bearipOnDataChange('positions', odRenderPublishedCards);
    bearipOnDataChange('ipFollowers', odRenderPublishedCards);
    bearipOnDataChange('ipCheers', odRenderPublishedCards);
    bearipOnDataChange('ipViews', odRenderPublishedCards);
    bearipOnDataChange('episodeComments', odRenderPublishedCards);
    bearipOnDataChange('crewChat', odRenderPublishedCards);
  }
});
