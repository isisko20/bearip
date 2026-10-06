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
  renderFollowing();
  // True up bio/응원 drift for anyone already opted in (e.g. an IP picked up
  // likes since the last time positions/portfolio were saved here) — a
  // no-op (bearipSyncMyCreatorProfile removes instead) if no position is set.
  if (typeof bearipSyncMyCreatorProfile === 'function') bearipSyncMyCreatorProfile();
  // 받은 제안 counts notifications, which load from Firebase asynchronously —
  // the very first renderStats() call above can easily land before that
  // listener's first snapshot arrives, undercounting until something else
  // happens to re-render. Re-run once real data shows up (same pattern as
  // auth-ui.js's unread-badge refresh).
  if (typeof bearipOnDataChange === 'function') {
    bearipOnDataChange('notifications', renderStats);
    bearipOnDataChange('ipCheers', renderStats);
    // 지원한 포지션 count and the 소속 크루 rows both come from shared
    // posting/applicant data that loads (and changes) asynchronously.
    ['positions', 'positionApplicants', 'ipJoinRequests'].forEach((kind) => {
      bearipOnDataChange(kind, renderStats);
      bearipOnDataChange(kind, renderCrew);
    });
    ['ipFollowers', 'publicIPs', 'allIPs'].forEach((kind) => bearipOnDataChange(kind, renderFollowing));
  }

  // ---- Tabs ----
  function activateTab(name) {
    const tab = document.querySelector(`#pfTabs .pf-tab[data-pf-tab="${name}"]`);
    if (!tab) return;
    document.querySelectorAll('#pfTabs .pf-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.pf-tab-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.dataset.pfPanel === name);
    });
  }
  document.querySelectorAll('#pfTabs .pf-tab').forEach((tab) => {
    tab.addEventListener('click', () => activateTab(tab.dataset.pfTab));
  });
  // crew-match.html's "나도 크리에이터로 등록하기" links here with ?tab=positions
  // so it lands directly on the tab that actually makes you findable there,
  // instead of the default 프로필 설정 tab.
  const requestedTab = new URLSearchParams(location.search).get('tab');
  if (requestedTab) activateTab(requestedTab);

  // ---- 프로필 설정 저장 ----
  document.getElementById('settingsSaveBtn').addEventListener('click', () => {
    // 닉네임은 계정(PIN)과 모든 기록의 열쇠라서 여기서는 바꾸지 않아요 — 예전처럼
    // 아무 값으로 바꿀 수 있으면 남의 닉네임(GM 포함)으로 PIN 없이 갈아탈 수 있어요.
    const bio = document.getElementById('settingsBio').value.trim();
    const current = bearipGetUser();
    const updated = bearipSetUser(Object.assign({}, current, { bio }));
    renderHeader(updated);
    flashSaved('settingsSavedNote');
    if (typeof bearipSyncMyCreatorProfile === 'function') bearipSyncMyCreatorProfile();
  });

  // ---- 가능한 포지션 저장 ----
  document.getElementById('positionsSaveBtn').addEventListener('click', () => {
    const selected = Array.from(document.querySelectorAll('#positionsChipRow .pf-chip.active')).map(
      (c) => c.dataset.pos
    );
    bearipSetMyPositions(selected);
    flashSaved('positionsSavedNote');
    // This is the save that actually makes "다른 IP 오너가 CREW MATCH에서 나를
    // 더 쉽게 찾을 수 있어요" (see the panel copy above) true — publishes/
    // clears this profile's public creator card depending on whether any
    // position is selected.
    if (typeof bearipSyncMyCreatorProfile === 'function') bearipSyncMyCreatorProfile();
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
    if (typeof bearipSyncMyCreatorProfile === 'function') bearipSyncMyCreatorProfile();
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
  // 참여한 IP = ones I made + ones I'm crew on (accepted 참여하기 or CREW
  // MATCH posting) — same crew definition CREW MATCH's own "참여 중인 IP" uses.
  const ownIds = new Set(ips.map((ip) => ip.id));
  const crewCount = typeof bearipMyCrewIpKeys === 'function' ? bearipMyCrewIpKeys().filter((k) => !ownIds.has(k)).length : 0;
  document.getElementById('pfStatIps').textContent = ips.length + crewCount;
  const appliedEl = document.getElementById('pfStatApplied');
  if (appliedEl) appliedEl.textContent = bearipMyAppliedPositionIds().length;
  // 받은 제안 — CREW MATCH's "매치 제안" delivers a real notification to the
  // target creator (crew-match.js), tagged with this exact title; counting
  // those is simpler than a dedicated proposals collection and stays correct
  // for the same reason 지원한 포지션 above just counts a persisted set.
  const proposalsEl = document.getElementById('pfStatProposals');
  if (proposalsEl) {
    proposalsEl.textContent = bearipLoadNotifications().filter((n) => n.title === '매치 제안을 받았어요').length;
  }
  // 받은 응원 — the real sum of unique cheerers across every IP this user
  // owns (bearipIpCheerCount, same count ip-detail.js's 응원 button and
  // CONTENT ROOM both read/write).
  const cheersEl = document.getElementById('pfStatCheers');
  if (cheersEl) cheersEl.textContent = bearipFormatCount(ips.reduce((sum, ip) => sum + bearipIpCheerCount(ip.id), 0));
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
      if (typeof bearipSyncMyCreatorProfile === 'function') bearipSyncMyCreatorProfile();
    });
    grid.appendChild(card);
  });
}

const PF_APPLY_STATUS = {
  pending: { cls: 'pending', label: '검토 중' },
  accepted: { cls: 'member', label: '크루 참여 중' },
  rejected: { cls: 'rejected', label: '거절됨' },
};

function pfPositionLabel(posId) {
  const pos = (typeof bearipLoadPositions === 'function' ? bearipLoadPositions() : []).find((p) => p.id === posId);
  return pos ? { ip: pos.ipTitle, role: pos.role } : null;
}

function pfCrewThumbStyle(ip) {
  const imageAsset = (ip && ip.assets || []).find((a) => a.imageData);
  const coverUrl = (ip && ip.coverImage) || (imageAsset && imageAsset.imageData);
  return coverUrl ? ` style="background-image:url('${coverUrl}');background-size:cover;background-position:center"` : '';
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
  // someone else's project.
  // The real request records carry their own IP title (and the owner's
  // answer), so this no longer depends on the IP being in this browser.
  const publicIps = typeof bearipLoadBrowsableIPs === 'function' ? bearipLoadBrowsableIPs() : [];
  const JOIN_STATUS = {
    pending: { cls: 'pending', label: '승인 대기' },
    accepted: { cls: 'member', label: '크루 참여 중' },
    rejected: { cls: 'rejected', label: '거절됨' },
  };
  bearipMyJoinRequests().forEach((req) => {
    const ip = ips.find((i) => i.id === req.ipId) || publicIps.find((i) => i.id === req.ipId);
    const meta = JOIN_STATUS[req.status] || JOIN_STATUS.pending;
    rows.push(`
      <div class="pf-crew-row">
        <div class="pf-crew-thumb"${pfCrewThumbStyle(ip)}></div>
        <div class="pf-crew-info"><div class="n">${esc(req.ipTitle || '제목 없는 IP')}</div><div class="r">크루 참여 신청</div></div>
        <span class="pf-crew-status ${meta.cls}">${meta.label}</span>
      </div>
    `);
  });

  // CREW MATCH positions this user applied to, with the real outcome —
  // same cross-reference crew-match-status.js's 나의 매치 현황 uses.
  bearipMyAppliedPositionIds().forEach((posId) => {
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

function renderFollowing() {
  const list = document.getElementById('followingList');
  if (!list) return;
  const esc = typeof bearipEscapeHtml === 'function' ? bearipEscapeHtml : (s) => s;
  const followed = typeof bearipMyFollowedIps === 'function' ? bearipMyFollowedIps() : [];

  if (!followed.length) {
    list.innerHTML = '<div class="pf-crew-empty">아직 팔로우한 IP가 없어요. OPEN DNA나 CONTENT ROOM에서 마음에 드는 IP를 팔로우해보세요.</div>';
    return;
  }

  list.innerHTML = followed
    .map(
      (ip) => `
      <div class="pf-crew-row">
        <div class="pf-crew-thumb"${pfCrewThumbStyle(ip)}></div>
        <div class="pf-crew-info"><div class="n">${esc(ip.title || '제목 없는 IP')}</div><div class="r">팔로워 ${bearipFollowerCount(ip.id)}명</div></div>
        <button type="button" class="pf-following-view-btn" data-id="${bearipEscapeAttr(ip.id)}">보기</button>
        <button type="button" class="pf-following-unfollow-btn" data-id="${bearipEscapeAttr(ip.id)}">언팔로우</button>
      </div>
    `
    )
    .join('');

  list.querySelectorAll('.pf-following-view-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ip = followed.find((i) => i.id === btn.dataset.id);
      if (!ip) return;
      sessionStorage.setItem('bearip_view_ip_snapshot', JSON.stringify(ip));
      location.href = 'ip-detail.html';
    });
  });
  list.querySelectorAll('.pf-following-unfollow-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      bearipUnfollowIp(btn.dataset.id);
      bearipShowToast('팔로우를 취소했어요');
      renderFollowing();
    });
  });
}

function flashSaved(id) {
  const el = document.getElementById(id);
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}
