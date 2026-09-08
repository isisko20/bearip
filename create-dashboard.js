// Injects locally-saved IPs (created via new-ip.html) into the DNA ROOM home dashboard.
document.addEventListener('DOMContentLoaded', () => {
  const ips = typeof bearipLoadIPs === 'function' ? bearipLoadIPs() : [];
  if (ips.length === 0) return;

  const track = document.getElementById('myDnaTrack');
  const thumbClasses = ['thumb-6', 'thumb-3', 'thumb-4', 'thumb-2', 'thumb-1'];

  ips.forEach((ip, i) => {
    const card = document.createElement('article');
    card.className = 'dr-card';
    card.style.cursor = 'pointer';
    card.onclick = () => {
      bearipSetCurrentId(ip.id);
      location.href = 'my-dna.html';
    };
    const genreText = ip.genres && ip.genres.length ? ip.genres.join(', ') : '장르 미정';
    const dna = ip.dnaScore || 0;
    const imageAsset = (ip.assets || []).find((a) => a.imageData);
    const thumbClass = imageAsset ? '' : thumbClasses[i % thumbClasses.length];
    const thumbStyle = imageAsset
      ? ` style="background-image:url('${imageAsset.imageData}');background-size:cover;background-position:center"`
      : '';
    card.innerHTML = `
      <div class="thumb ${thumbClass}"${thumbStyle}><span class="tlabel">${ip.title}</span></div>
      <div class="title">${ip.title}</div>
      <div class="genre">${genreText}</div>
      <div class="dna-bar"><div class="dna-bar-fill" style="width:${dna}%"></div></div>
      <div class="dna-label">DNA ${dna}%</div>
    `;
    track.insertBefore(card, track.firstChild);
  });
});

// Injects real published IPs (visibility === 'public', same flag MY DNA's
// OPEN DNA에 공개하기 button sets) into the OPEN DNA panel's carousel, ahead
// of the static demo cards — so once something real is public, it's the
// first thing shown here instead of only fake projects.
document.addEventListener('DOMContentLoaded', () => {
  const track = document.getElementById('openDnaTrack');
  if (!track || typeof bearipLoadIPs !== 'function') return;

  const publicIPs = bearipLoadIPs().filter((ip) => ip.visibility === 'public');
  if (!publicIPs.length) return;

  const thumbClasses = ['thumb-7', 'thumb-8', 'thumb-5', 'thumb-6'];

  publicIPs.forEach((ip, i) => {
    const card = document.createElement('article');
    card.className = 'dr-card';
    card.style.cursor = 'pointer';
    card.onclick = () => {
      sessionStorage.setItem('bearip_view_ip_id', ip.id);
      location.href = 'ip-detail.html';
    };
    const genreText = ip.genres && ip.genres.length ? ip.genres.join(', ') : '장르 미정';
    const dna = ip.dnaScore || 0;
    const imageAsset = (ip.assets || []).find((a) => a.imageData);
    const thumbClass = imageAsset ? '' : thumbClasses[i % thumbClasses.length];
    const thumbStyle = imageAsset
      ? ` style="background-image:url('${imageAsset.imageData}');background-size:cover;background-position:center"`
      : '';
    card.innerHTML = `
      <div class="thumb ${thumbClass}"${thumbStyle}><span class="tlabel">${ip.title}</span></div>
      <div class="title">${ip.title}</div>
      <div class="genre">${genreText}</div>
      <div class="dna-bar"><div class="dna-bar-fill" style="width:${dna}%"></div></div>
      <div class="dna-label">DNA ${dna}%</div>
    `;
    track.insertBefore(card, track.firstChild);
  });
});

// Hero "상상력 구체화하기" CTA — jumps into the most recently touched real
// IP (bearipAddIP unshifts, so index 0 is most recent). With no real IP yet
// there's nothing to continue, so it's an honest toast instead of a dead click.
function renderHeroContinueCta() {
  const btn = document.getElementById('drHeroContinueBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const ips = typeof bearipLoadIPs === 'function' ? bearipLoadIPs() : [];
    if (!ips.length) {
      bearipShowToast('아직 만든 IP가 없어요. 먼저 상상력을 만들어보세요!');
      return;
    }
    if (!bearipRequireLogin('my-dna.html')) return;
    bearipSetCurrentId(ips[0].id);
    location.href = 'my-dna.html';
  });
}

document.addEventListener('DOMContentLoaded', renderHeroContinueCta);

// Hero live-preview cards — "연재중인 IP" shows the user's most recent real
// IP, "크루 구하기" shows the most recent real recruiting post (from CREW
// MATCH's "모집글 올리기" flow). Either falls back to an honest empty-state
// prompt instead of fabricated numbers when there's nothing real yet.
function renderHeroLiveCards() {
  const ongoingCard = document.getElementById('drHeroOngoing');
  const ongoingBody = document.getElementById('drHeroOngoingBody');
  const crewCard = document.getElementById('drHeroCrew');
  const crewBody = document.getElementById('drHeroCrewBody');
  if (!ongoingCard || !ongoingBody || !crewCard || !crewBody) return;

  const thumbClasses = ['thumb-6', 'thumb-3', 'thumb-4', 'thumb-2', 'thumb-1'];
  const ips = typeof bearipLoadIPs === 'function' ? bearipLoadIPs() : [];

  if (ips.length) {
    const ip = ips[0];
    const imageAsset = (ip.assets || []).find((a) => a.imageData);
    const thumbClass = imageAsset ? '' : thumbClasses[0];
    const thumbStyle = imageAsset
      ? ` style="background-image:url('${imageAsset.imageData}');background-size:cover;background-position:center"`
      : '';
    ongoingBody.innerHTML = `
      <div class="dr-hero-live-thumb ${thumbClass}"${thumbStyle}></div>
      <div class="dr-hero-live-info">
        <div class="t">${bearipEscapeHtml(ip.title || '제목 없는 IP')}</div>
        <div class="s">DNA ${ip.dnaScore || 0}%</div>
      </div>
    `;
    ongoingCard.addEventListener('click', (e) => {
      e.preventDefault();
      bearipSetCurrentId(ip.id);
      location.href = 'my-dna.html';
    });
  } else {
    ongoingBody.innerHTML = '<div class="dr-hero-live-empty">아직 연재중인 IP가 없어요.<br>첫 IP를 만들어보세요.</div>';
    ongoingCard.href = 'new-ip.html';
    ongoingCard.addEventListener('click', (e) => {
      if (!bearipRequireLogin('new-ip.html')) e.preventDefault();
    });
  }

  const positions = typeof bearipLoadPositions === 'function' ? bearipLoadPositions() : [];
  if (positions.length) {
    const pos = positions[0]; // bearipAddPosition unshifts
    crewBody.innerHTML = `
      <div class="dr-hero-live-thumb ${pos.thumb || 'thumb-3'}"></div>
      <div class="dr-hero-live-info">
        <div class="t">${bearipEscapeHtml(pos.ipTitle)} · ${bearipEscapeHtml(pos.role)} 모집</div>
        <div class="s">${pos.filled || 0}/${pos.count}명 · ${bearipEscapeHtml(pos.deadlineText || '상시 모집')}</div>
      </div>
    `;
  } else {
    crewBody.innerHTML = '<div class="dr-hero-live-empty">지금 크루를 구하고 있는<br>프로젝트를 둘러보세요.</div>';
  }
}

document.addEventListener('DOMContentLoaded', renderHeroLiveCards);

// "IP DNA 현황" summary — shows the 6-category breakdown (shared with MY DNA
// and OPEN DNA via storage.js) for the user's most recently created real IP.
// With no real IPs yet, shows a "Create Your Contents" empty state instead
// of demo numbers, since there's nothing actually in progress to report.
function renderDnaStatus() {
  const body = document.getElementById('drDnaStatusBody');
  if (!body || typeof bearipLoadIPs !== 'function') return;

  const ips = bearipLoadIPs();
  const subEl = document.getElementById('drDnaStatusSub');

  if (!ips.length) {
    if (subEl) subEl.textContent = '아직 진행 중인 IP가 없어요';
    body.innerHTML = `
      <div class="dr-dna-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        <div class="t">아직 만든 IP가 없어요</div>
        <div class="s">첫 IP를 만들면 항목별 완성도를 여기서 확인할 수 있어요.</div>
        <button type="button" class="btn" id="drDnaEmptyCreateBtn">Create Your Contents</button>
      </div>
    `;
    const createBtn = document.getElementById('drDnaEmptyCreateBtn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        if (typeof bearipRequireLogin === 'function' && !bearipRequireLogin('new-ip.html')) return;
        location.href = 'new-ip.html';
      });
    }
    return;
  }

  const ip = ips[0]; // bearipAddIP unshifts, so index 0 is the most recent
  bearipEnsureDnaBreakdown(ip);
  if (subEl) subEl.textContent = `'${ip.title || '제목 없는 IP'}'의 항목별 완성도예요`;

  const tilesHtml = BEARIP_DNA_CATEGORIES.map((cat, i) => {
    const value = (ip.dnaBreakdown && ip.dnaBreakdown[cat.key]) || 0;
    return `
      <div class="dr-dna-tile">
        <div class="dr-dna-tile-ic">${cat.icon}</div>
        <div class="dr-dna-tile-num">0${i + 1}</div>
        <div class="dr-dna-tile-label">${cat.label}</div>
        <div class="dr-dna-tile-value">${value}%</div>
        <div class="dr-dna-tile-tip">${bearipDnaTip(cat.key, value)}</div>
      </div>
    `;
  }).join('');

  body.innerHTML = `
    <div class="dr-dna-body">
      <div class="dr-dna-tiles">${tilesHtml}</div>
      <div class="dr-dna-score-panel">
        <div class="dr-dna-score-ring" style="--p:${ip.dnaScore}">
          <div class="dr-dna-score-ring-inner">
            <span class="v">${ip.dnaScore}%</span>
            <span class="t">${bearipDnaScoreTier(ip.dnaScore)}</span>
          </div>
        </div>
        <p class="dr-dna-score-hint">6개 항목의 평균으로 계산돼요.</p>
        <a class="dr-dna-status-link" href="my-dna.html">MY DNA에서 자세히 보기 →</a>
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', renderDnaStatus);

// "내 프로젝트 목록" — a compact, clickable strip of every real IP the user
// has, so they can jump straight into any of them from the home page
// without scrolling to the MY DNA carousel below. Hidden entirely when
// there are no real IPs yet (the empty state is already covered by the
// "Create Your Contents" prompt in the DNA 현황 section beneath it).
function renderMyProjectsList() {
  const section = document.getElementById('drMyProjects');
  const row = document.getElementById('drProjectChipRow');
  if (!section || !row || typeof bearipLoadIPs !== 'function') return;

  const ips = bearipLoadIPs();
  if (!ips.length) {
    section.style.display = 'none';
    return;
  }

  const current = typeof bearipGetCurrentIP === 'function' ? bearipGetCurrentIP() : null;
  const currentId = current ? current.id : null;

  row.innerHTML = ips
    .map((ip) => {
      const active = ip.id === currentId;
      return `
        <button type="button" class="dr-project-chip${active ? ' active' : ''}" data-ip-id="${ip.id}">
          <span class="t">${bearipEscapeHtml(ip.title || '제목 없는 IP')}</span>
          <span class="d">DNA ${ip.dnaScore || 0}%</span>
        </button>
      `;
    })
    .join('');

  row.querySelectorAll('.dr-project-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      bearipSetCurrentId(chip.dataset.ipId);
      location.href = 'my-dna.html';
    });
  });
}

document.addEventListener('DOMContentLoaded', renderMyProjectsList);

// Bottom stat bar — real numbers scoped to this browser's own account, not
// a fabricated platform-wide count (there's no backend to count "everyone").
function renderBottomStats() {
  const ipsEl = document.getElementById('bottomStatIps');
  if (!ipsEl || typeof bearipLoadIPs !== 'function') return;

  const ips = bearipLoadIPs();
  const joined = typeof bearipSetList === 'function' ? bearipSetList('bearip_joined_ips') : [];
  const applied = typeof bearipSetList === 'function' ? bearipSetList('bearip_applied_positions') : [];
  const positions = typeof bearipLoadPositions === 'function' ? bearipLoadPositions() : [];
  const likesTotal = ips.reduce((sum, ip) => sum + (ip.likes || 0), 0);

  ipsEl.textContent = bearipFormatCount(ips.length);
  document.getElementById('bottomStatJoined').textContent = bearipFormatCount(joined.length);
  document.getElementById('bottomStatApplied').textContent = bearipFormatCount(applied.length);
  document.getElementById('bottomStatLikes').textContent = bearipFormatCount(likesTotal);
  document.getElementById('bottomStatPositions').textContent = bearipFormatCount(positions.length);
}

document.addEventListener('DOMContentLoaded', renderBottomStats);
