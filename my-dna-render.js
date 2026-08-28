// Renders the MY DNA workspace from the currently selected IP in localStorage
// (falls back to a static demo IP when nothing has been created yet).

const GOAL_LABELS = { webnovel: '웹소설', webtoon: '웹툰', video: '영상', multi: '멀티포맷' };

const ROAD_ICONS = {
  story: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4.5C4 3.7 4.7 3 5.5 3H18a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2z"/><path d="M6 3v18"/></svg>',
  character: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M5.5 20c0-3.6 3-5.8 6.5-5.8s6.5 2.2 6.5 5.8"/></svg>',
  visual: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3a6 6 0 000 12 2 2 0 010 4"/><circle cx="8" cy="10" r="1" fill="currentColor"/><circle cx="12" cy="7" r="1" fill="currentColor"/><circle cx="16" cy="10" r="1" fill="currentColor"/></svg>',
  background: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V9l6-4 6 4v12"/><path d="M10 21v-6h4v6"/></svg>',
  storyboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/></svg>',
  art: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l4-1 12-12-3-3L4 17l-1 4z"/><path d="M14 6l3 3"/></svg>',
  lettering: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 01-8.9 8.4 8.6 8.6 0 01-3.8-.9L3 20l1.1-5A8.4 8.4 0 1121 11.5z"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4.5 4.5 0 01-1-8.9 5.5 5.5 0 0110.6-1.8A4.5 4.5 0 0117 18z"/><path d="M12 11v7M9.5 15.5L12 13l2.5 2.5"/></svg>',
};
const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';
const ARROW_HTML = '<div class="md-road-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></div>';

const ASSET_ICONS = {
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4.5C4 3.7 4.7 3 5.5 3H18a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h11l5 5v11a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z"/><path d="M14 4v5h5M8 13h8M8 17h5"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 15l5-5 4 4 4-4 5 5"/><circle cx="8" cy="9" r="1.4"/></svg>',
};

const DEMO_IP = {
  id: 'demo',
  title: '서울 야행수선단',
  goal: 'webtoon',
  dnaScore: 78,
  readinessScore: 57,
  productionProgress: 23,
  roadmap: [
    { key: 'story', label: '스토리', status: 'done', progress: 100 },
    { key: 'character', label: '캐릭터<br>디자인', status: 'done', progress: 100 },
    { key: 'visual', label: '비주얼<br>가이드', status: 'done', progress: 100 },
    { key: 'background', label: '배경/장소', status: 'progress', progress: 60 },
    { key: 'storyboard', label: '콘티', status: 'progress', progress: 35 },
    { key: 'art', label: '작화', status: 'todo', progress: 0 },
    { key: 'lettering', label: '레터링/<br>검수', status: 'todo', progress: 0 },
    { key: 'upload', label: '업로드/<br>연재', status: 'todo', progress: 0 },
  ],
  assets: [
    { name: '캐릭터 시트', ver: 'v1.2', date: '2024.05.12', thumb: 'thumb-5', icon: 'user', type: 'character' },
    { name: '세계관 문서', ver: 'v2.0', date: '2024.05.10', thumb: 'thumb-2', icon: 'doc', type: 'world' },
    { name: 'EP01 시놉시스', ver: 'v1.1', date: '2024.05.09', thumb: 'thumb-8', icon: 'file', type: 'story' },
    { name: '콘셉트 아트', ver: 'v1.0', date: '2024.05.07', thumb: 'thumb-7', icon: 'image', type: 'art' },
  ],
  discussion: [
    { id: 'dc_seed_1', name: '라라', role: '스토리보드', text: 'EP03 콘티 초안 올렸어요! 배경 톤 관련해서 의견 부탁드려요 🙏', likes: 8, likedByMe: false, thumb: 'thumb-3', createdAt: new Date(Date.now() - 60 * 24 * 2 * 60000).toISOString() },
    { id: 'dc_seed_2', name: '몽몽', role: '비주얼 가이드', text: '배경/장소 레퍼런스 60%까지 정리했어요. 다음 주까지 마무리할게요.', likes: 5, likedByMe: false, thumb: 'thumb-4', createdAt: new Date(Date.now() - 60 * 24 * 3 * 60000).toISOString() },
    { id: 'dc_seed_3', name: '판타지 (나)', role: '원작 · 스토리', text: 'Visual Artist 포지션 2명 추가로 모집 시작했습니다. 관심 있으신 분들 CREW MATCH에서 확인해주세요!', likes: 12, likedByMe: false, thumb: 'thumb-2', createdAt: new Date(Date.now() - 60 * 24 * 5 * 60000).toISOString() },
  ],
};

function mdFormatRelativeTime(iso) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

let currentIP = null;

function loadCurrentIP() {
  const stored = typeof bearipGetCurrentIP === 'function' ? bearipGetCurrentIP() : null;
  currentIP = stored || DEMO_IP;
}

function renderHeader() {
  document.getElementById('currentIpChip').textContent = `📁 ${currentIP.title}`;
}

function renderGoals() {
  document.querySelectorAll('.md-goal').forEach((btn) => {
    btn.classList.remove('active');
    const existingCheck = btn.querySelector('.md-goal-check');
    if (existingCheck) existingCheck.remove();
  });
  const activeBtn = document.querySelector(`.md-goal[data-goal="${currentIP.goal}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
    const check = document.createElement('span');
    check.className = 'md-goal-check';
    check.innerHTML = CHECK_SVG;
    activeBtn.prepend(check);
  }
}

function renderStatus() {
  document.getElementById('dnaScoreValue').textContent = currentIP.dnaScore + '%';
  document.getElementById('dnaScoreBar').style.width = currentIP.dnaScore + '%';
  document.getElementById('readinessValue').textContent = currentIP.readinessScore + '%';
  document.getElementById('readinessBar').style.width = currentIP.readinessScore + '%';
  document.getElementById('readinessDesc').textContent = `선택한 목표(${GOAL_LABELS[currentIP.goal]}) 준비도`;
  document.getElementById('productionValue').textContent = currentIP.productionProgress + '%';
  document.getElementById('productionBar').style.width = currentIP.productionProgress + '%';
}

function renderRoadmap() {
  document.getElementById('roadmapTitle').textContent = `${GOAL_LABELS[currentIP.goal]} 개발 맵`;
  document.getElementById('roadmapGoalBadge').textContent = `선택한 목표: ${GOAL_LABELS[currentIP.goal]}`;
  document.getElementById('needsHint').textContent = `(${GOAL_LABELS[currentIP.goal]} 목표 기준)`;

  const container = document.getElementById('roadmapContainer');
  container.innerHTML = '';
  currentIP.roadmap.forEach((step, i) => {
    const stepEl = document.createElement('div');
    stepEl.className = 'md-road-step' + (step.status === 'done' ? ' done' : step.status === 'progress' ? ' progress' : '');

    const isRing = step.status === 'progress';
    const wrapAttrs = isRing ? ` style="--p:${step.progress}"` : '';
    const wrapClass = isRing ? 'md-road-ic-wrap ring' : 'md-road-ic-wrap';
    const checkHtml = step.status === 'done' ? `<span class="md-road-check">${CHECK_SVG}</span>` : '';
    const statusText = step.status === 'done' ? '완료' : `${step.progress}%`;

    stepEl.innerHTML = `
      <div class="${wrapClass}"${wrapAttrs}>
        <div class="md-road-ic">${ROAD_ICONS[step.key] || ''}</div>
        ${checkHtml}
      </div>
      <div class="md-road-name">${step.label}</div>
      <div class="md-road-status">${statusText}</div>
    `;
    container.appendChild(stepEl);
    if (i < currentIP.roadmap.length - 1) {
      container.insertAdjacentHTML('beforeend', ARROW_HTML);
    }
  });
}

function renderAssets() {
  const row = document.getElementById('assetsRow');
  row.querySelectorAll('.md-asset-card').forEach((el) => el.remove());
  const existingEmpty = row.querySelector('.md-assets-empty');
  if (existingEmpty) existingEmpty.remove();
  const addBtn = row.querySelector('.md-asset-add');

  if (!currentIP.assets || currentIP.assets.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'md-assets-empty';
    empty.textContent = '아직 업로드한 자산이 없어요. 첫 자산을 추가해보세요.';
    row.insertBefore(empty, addBtn);
    return;
  }

  currentIP.assets.forEach((asset) => {
    const card = document.createElement('div');
    card.className = 'md-asset-card';
    card.dataset.type = asset.type || 'other';
    card.innerHTML = `
      <div class="md-asset-thumb ${asset.thumb || 'thumb-1'}">${ASSET_ICONS[asset.icon] || ''}</div>
      <div class="md-asset-name">${asset.name}</div>
      <div class="md-asset-meta">${asset.ver} · ${asset.date}</div>
    `;
    row.insertBefore(card, addBtn);
  });
}

function renderDiscussion() {
  const list = document.getElementById('discussList');
  if (!list) return;
  list.innerHTML = '';

  const posts = currentIP.discussion || [];
  if (posts.length === 0) {
    list.innerHTML = '<div class="md-discuss-empty">아직 올라온 이야기가 없어요. 첫 소식을 남겨보세요.</div>';
    return;
  }

  posts.forEach((post) => {
    const el = document.createElement('div');
    el.className = 'md-discuss-item';
    const esc = typeof bearipEscapeHtml === 'function' ? bearipEscapeHtml : (s) => s;
    el.innerHTML = `
      <div class="md-discuss-avatar ${post.thumb || 'thumb-1'}"></div>
      <div class="md-discuss-body">
        <div class="md-discuss-head"><span class="n">${esc(post.name)}</span><span class="r">${esc(post.role)}</span><span class="d">${mdFormatRelativeTime(post.createdAt)}</span></div>
        <div class="md-discuss-text">${esc(post.text)}</div>
        <div class="md-discuss-meta">
          <button class="md-discuss-reply" data-id="${post.id}">답글</button>
          <button class="md-discuss-like${post.likedByMe ? ' liked' : ''}" data-id="${post.id}">좋아요 ${post.likes}</button>
        </div>
      </div>
    `;
    list.appendChild(el);
  });
}

function persistDiscussion() {
  if (currentIP.id !== 'demo' && typeof bearipUpdateIP === 'function') {
    bearipUpdateIP(currentIP.id, { discussion: currentIP.discussion });
  }
}

function renderAll() {
  renderHeader();
  renderGoals();
  renderStatus();
  renderRoadmap();
  renderAssets();
  renderDiscussion();
}

function persistGoalChange(goal) {
  currentIP.goal = goal;
  if (currentIP.id !== 'demo' && typeof bearipUpdateIP === 'function') {
    bearipUpdateIP(currentIP.id, { goal });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadCurrentIP();
  renderAll();

  // Re-render dependent sections (status label, roadmap title, badge) whenever
  // the goal is switched — my-dna.js already handles the button's own visual toggle.
  document.querySelectorAll('.md-goal').forEach((btn) => {
    btn.addEventListener('click', () => {
      persistGoalChange(btn.dataset.goal);
      renderStatus();
      renderRoadmap();
    });
  });

  bindAssetAddTile();
});

function addAssetFromTitle(title) {
  const cycle = [
    { type: 'character', icon: 'user', thumb: 'thumb-5' },
    { type: 'world', icon: 'doc', thumb: 'thumb-2' },
    { type: 'story', icon: 'file', thumb: 'thumb-8' },
    { type: 'art', icon: 'image', thumb: 'thumb-7' },
  ];
  const pick = cycle[(currentIP.assets || []).length % cycle.length];
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

  const asset = { name: title, ver: 'v1.0', date: dateStr, thumb: pick.thumb, icon: pick.icon, type: pick.type };
  currentIP.assets = [...(currentIP.assets || []), asset];
  if (currentIP.id !== 'demo') bearipUpdateIP(currentIP.id, { assets: currentIP.assets });
  renderAssets();
}

// Turns the "새 자산 추가" tile into an inline title input, in place — no
// native prompt() dialog, since some embedded/sandboxed browser contexts
// block those outright.
function bindAssetAddTile() {
  const tile = document.getElementById('assetAddTile');
  if (!tile || tile.dataset.bound) return;
  tile.dataset.bound = '1';

  function activate() {
    if (!bearipRequireLogin('my-dna.html')) return;
    tile.innerHTML = `
      <div class="md-asset-add-form">
        <input type="text" id="assetTitleInput" placeholder="자산 이름" maxlength="30">
        <div class="row">
          <button type="button" class="confirm" id="assetConfirmBtn">추가</button>
          <button type="button" class="cancel" id="assetCancelBtn">취소</button>
        </div>
      </div>
    `;
    const input = document.getElementById('assetTitleInput');
    input.focus();
    input.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitAsset();
      if (e.key === 'Escape') reset();
    });
    document.getElementById('assetConfirmBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      submitAsset();
    });
    document.getElementById('assetCancelBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      reset();
    });
  }

  function submitAsset() {
    const input = document.getElementById('assetTitleInput');
    const title = input.value.trim();
    if (!title) {
      input.focus();
      return;
    }
    addAssetFromTitle(title);
    reset();
  }

  function reset() {
    tile.innerHTML = `
      <span class="md-asset-add-default">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        새 자산 추가
      </span>
    `;
  }

  tile.addEventListener('click', () => {
    if (tile.querySelector('.md-asset-add-form')) return;
    activate();
  });
  tile.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !tile.querySelector('.md-asset-add-form')) {
      e.preventDefault();
      activate();
    }
  });
}
