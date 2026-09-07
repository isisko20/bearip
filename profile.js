// 마이페이지: profile settings, available positions, portfolio, crew list.
// Requires a mock login — bounces to login.html if nobody is signed in.

document.addEventListener('DOMContentLoaded', () => {
  if (!bearipRequireLogin('profile.html')) return;

  const user = bearipGetUser();
  renderHeader(user);
  document.getElementById('settingsNickname').value = user.nickname || '';
  document.getElementById('settingsBio').value = user.bio || '';

  renderStats();
  renderPositionsChips();
  renderPortfolio();
  renderCrew();

  // ---- Tabs ----
  document.querySelectorAll('#pfTabs .pf-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#pfTabs .pf-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.pf-tab-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.dataset.pfPanel === tab.dataset.pfTab);
      });
    });
  });

  // ---- 프로필 설정 저장 ----
  document.getElementById('settingsSaveBtn').addEventListener('click', () => {
    const nickname = document.getElementById('settingsNickname').value.trim() || '게스트';
    const bio = document.getElementById('settingsBio').value.trim();
    const current = bearipGetUser();
    const updated = bearipSetUser({ nickname, bio, joinedAt: current.joinedAt });
    renderHeader(updated);
    flashSaved('settingsSavedNote');
  });

  // ---- 가능한 포지션 저장 ----
  document.getElementById('positionsSaveBtn').addEventListener('click', () => {
    const selected = Array.from(document.querySelectorAll('#positionsChipRow .pf-chip.active')).map(
      (c) => c.dataset.pos
    );
    bearipSetMyPositions(selected);
    flashSaved('positionsSavedNote');
  });

  // ---- 포트폴리오 추가 ----
  document.getElementById('portfolioAddBtn').addEventListener('click', () => {
    const titleInput = document.getElementById('portfolioTitle');
    const title = titleInput.value.trim();
    if (!title) {
      titleInput.focus();
      return;
    }
    const visibility = document.getElementById('portfolioVis').value;
    const thumbs = ['thumb-1', 'thumb-2', 'thumb-3', 'thumb-4', 'thumb-5', 'thumb-6', 'thumb-7', 'thumb-8'];
    bearipAddPortfolioItem({
      id: 'pf_' + Date.now(),
      title,
      visibility,
      thumb: thumbs[Math.floor(Math.random() * thumbs.length)],
      createdAt: new Date().toISOString(),
    });
    titleInput.value = '';
    renderPortfolio();
  });

  // ---- 로그아웃 ----
  document.getElementById('pfLogoutBtn').addEventListener('click', () => {
    bearipLogout();
    location.href = 'index.html';
  });
});

function renderHeader(user) {
  document.getElementById('pfAvatar').textContent = (user.nickname || '?').slice(0, 1);
  document.getElementById('pfName').textContent = user.nickname || '게스트';
  document.getElementById('pfBio').textContent = user.bio || '아직 소개가 없어요.';
  if (user.joinedAt) {
    const d = new Date(user.joinedAt);
    const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    document.getElementById('pfJoined').textContent = `${dateStr}부터 함께하고 있어요`;
  }
}

function renderStats() {
  const ips = typeof bearipLoadIPs === 'function' ? bearipLoadIPs() : [];
  document.getElementById('pfStatIps').textContent = ips.length;
  const appliedEl = document.getElementById('pfStatApplied');
  if (appliedEl) appliedEl.textContent = bearipSetList('bearip_applied_positions').length;
  // 받은 응원 — the real sum of 좋아요 across every IP this user owns (same
  // count ip-detail.js's 응원 button and CONTENT ROOM both read/write).
  const cheersEl = document.getElementById('pfStatCheers');
  if (cheersEl) cheersEl.textContent = bearipFormatCount(ips.reduce((sum, ip) => sum + (ip.likes || 0), 0));
}

function renderPositionsChips() {
  const saved = typeof bearipGetMyPositions === 'function' ? bearipGetMyPositions() : [];
  document.querySelectorAll('#positionsChipRow .pf-chip').forEach((chip) => {
    chip.classList.toggle('active', saved.includes(chip.dataset.pos));
    chip.addEventListener('click', () => chip.classList.toggle('active'));
  });
}

const PORTFOLIO_VIS_LABEL = { apply: '지원할 때 공개', always: '항시 공개', private: '비공개' };

function renderPortfolio() {
  const grid = document.getElementById('portfolioGrid');
  const items = bearipLoadPortfolio();
  grid.innerHTML = '';

  if (items.length === 0) {
    grid.innerHTML = '<div class="pf-portfolio-empty">아직 등록한 포트폴리오가 없어요. 위에서 첫 작업물을 추가해보세요.</div>';
    return;
  }

  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'pf-portfolio-card';
    card.innerHTML = `
      <div class="pf-portfolio-thumb ${item.thumb}"></div>
      <div class="pf-portfolio-body">
        <span class="pf-vis-badge ${item.visibility}">${PORTFOLIO_VIS_LABEL[item.visibility] || item.visibility}</span>
        <div class="pf-portfolio-title">${item.title}</div>
      </div>
      <button class="pf-portfolio-delete" data-id="${item.id}">삭제</button>
    `;
    card.querySelector('.pf-portfolio-delete').addEventListener('click', () => {
      bearipDeletePortfolioItem(item.id);
      renderPortfolio();
    });
    grid.appendChild(card);
  });
}

// Same 5 static CREW MATCH demo postings crew-match-status.js resolves —
// duplicated here since profile.html doesn't load that file, matching how
// every od-app page already keeps its own small copy of this kind of map.
const PF_POSITION_LABELS = {
  'seoul-night-menders_visual-artist': { ip: '서울 야행수선단', role: 'Visual Artist' },
  'seoul-night-menders_bg-concept': { ip: '서울 야행수선단', role: '배경 컨셉 아티스트' },
  'cat-detective-momo_story-writer': { ip: '고양이 탐정 모모', role: 'Story Writer' },
  'memory-walking-girl_video-creator': { ip: '기억을 걷는 소녀', role: 'Video Creator' },
  'star-tower_bg-concept': { ip: '별을 품은 탑', role: '배경 컨셉 아티스트' },
  'ocean-planet_lettering': { ip: 'OCEAN PLANET', role: '레터링 스페셜리스트' },
};
const PF_APPLY_STATUS = {
  pending: { cls: 'pending', label: '검토 중' },
  accepted: { cls: 'member', label: '크루 참여 중' },
  rejected: { cls: 'rejected', label: '거절됨' },
};

function pfPositionLabel(posId) {
  if (PF_POSITION_LABELS[posId]) return PF_POSITION_LABELS[posId];
  const pos = (typeof bearipLoadPositions === 'function' ? bearipLoadPositions() : []).find((p) => p.id === posId);
  return pos ? { ip: pos.ipTitle, role: pos.role } : null;
}

function pfCrewThumbStyle(ip) {
  const imageAsset = (ip && ip.assets || []).find((a) => a.imageData);
  return imageAsset ? ` style="background-image:url('${imageAsset.imageData}');background-size:cover;background-position:center"` : '';
}

function renderCrew() {
  const list = document.getElementById('crewList');
  const ips = typeof bearipLoadIPs === 'function' ? bearipLoadIPs() : [];
  const user = typeof bearipGetUser === 'function' ? bearipGetUser() : null;
  const esc = typeof bearipEscapeHtml === 'function' ? bearipEscapeHtml : (s) => s;
  const rows = [];

  // IPs this user owns.
  ips.forEach((ip) => {
    rows.push(`
      <div class="pf-crew-row">
        <div class="pf-crew-thumb"${pfCrewThumbStyle(ip)}></div>
        <div class="pf-crew-info"><div class="n">${esc(ip.title || '제목 없는 IP')}</div><div class="r">내가 만든 IP</div></div>
        <span class="pf-crew-status owner">오너</span>
      </div>
    `);
  });

  // IPs this user asked to join as crew (ip-detail.html's 참여하기), on
  // someone else's project — the demo project included, since 참여하기
  // works there too.
  bearipSetList('bearip_joined_ips').forEach((id) => {
    const ip = ips.find((i) => i.id === id);
    const title = ip ? ip.title : id === 'demo' ? '서울 야행수선단 (예시)' : null;
    if (!title) return;
    rows.push(`
      <div class="pf-crew-row">
        <div class="pf-crew-thumb"${pfCrewThumbStyle(ip)}></div>
        <div class="pf-crew-info"><div class="n">${esc(title)}</div><div class="r">크루 참여 신청</div></div>
        <span class="pf-crew-status pending">승인 대기</span>
      </div>
    `);
  });

  // CREW MATCH positions this user applied to, with the real outcome —
  // same cross-reference crew-match-status.js's 나의 매치 현황 uses.
  bearipSetList('bearip_applied_positions').forEach((posId) => {
    const label = pfPositionLabel(posId);
    if (!label) return;
    const mine = user ? bearipGetApplicants(posId).find((a) => a.name === user.nickname) : null;
    const meta = PF_APPLY_STATUS[mine ? mine.status : 'pending'];
    rows.push(`
      <div class="pf-crew-row">
        <div class="pf-crew-thumb thumb-8"></div>
        <div class="pf-crew-info"><div class="n">${esc(label.ip)}</div><div class="r">${esc(label.role)} 지원</div></div>
        <span class="pf-crew-status ${meta.cls}">${meta.label}</span>
      </div>
    `);
  });

  list.innerHTML = rows.join('') || '<div class="pf-crew-empty">아직 참여 중인 크루가 없어요.</div>';
}

function flashSaved(id) {
  const el = document.getElementById(id);
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}
