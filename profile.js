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

function renderCrew() {
  const list = document.getElementById('crewList');
  const ips = typeof bearipLoadIPs === 'function' ? bearipLoadIPs() : [];
  list.innerHTML = '';

  ips.forEach((ip) => {
    const row = document.createElement('div');
    row.className = 'pf-crew-row';
    row.innerHTML = `
      <div class="pf-crew-thumb thumb-6"></div>
      <div class="pf-crew-info"><div class="n">${ip.title}</div><div class="r">내가 만든 IP</div></div>
      <span class="pf-crew-status owner">오너</span>
    `;
    list.appendChild(row);
  });

  // Demo memberships so the tab isn't empty on a fresh account.
  const demoRows = [
    { title: 'OCEAN PLANET', role: '레터링 스페셜리스트', status: 'member', label: '크루 참여 중', thumb: 'thumb-8' },
    { title: '서울 야행수선단', role: 'Visual Artist 지원', status: 'pending', label: '검토 중', thumb: 'thumb-1' },
  ];
  demoRows.forEach((d) => {
    const row = document.createElement('div');
    row.className = 'pf-crew-row';
    row.innerHTML = `
      <div class="pf-crew-thumb ${d.thumb}"></div>
      <div class="pf-crew-info"><div class="n">${d.title}</div><div class="r">${d.role}</div></div>
      <span class="pf-crew-status ${d.status}">${d.label}</span>
    `;
    list.appendChild(row);
  });

  if (ips.length === 0 && demoRows.length === 0) {
    list.innerHTML = '<div class="pf-crew-empty">아직 참여 중인 크루가 없어요.</div>';
  }
}

function flashSaved(id) {
  const el = document.getElementById(id);
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}
