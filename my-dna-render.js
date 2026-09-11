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
  video: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="14" height="12" rx="2"/><path d="M16.5 10.5l5-3v9l-5-3z"/></svg>',
};

const DEMO_IP = {
  id: 'demo',
  title: '서울 야행수선단',
  goal: 'webtoon',
  dnaScore: 68,
  dnaBreakdown: { ...BEARIP_DEMO_DNA_BREAKDOWN },
  readinessScore: 57,
  productionProgress: 23,
  // Statuses here map onto the unified per-step model (mdStepStatus below):
  // story/character/visual read as 전문가 진단까지 끝난 "준비 완료", background/
  // storyboard as 자료는 있지만 아직 검토 요청 전인 "작성 중", the rest genuinely
  // untouched — roughly preserving the demo's original 완료/진행중/미착수 feel.
  roadmap: [
    {
      key: 'story',
      label: '스토리',
      submission: { note: '메인 플롯과 결말까지 정리한 시놉시스', imageData: null, fileName: null, fileSize: null, mime: null },
      reviewStatus: 'reviewed',
      adminProgress: 100,
      adminComment: '완결까지 구조가 탄탄해요.',
      needsRevision: false,
      mode: 'self',
    },
    {
      key: 'character',
      label: '캐릭터<br>디자인',
      submission: { note: '주요 인물 5인 캐릭터 시트', imageData: null, fileName: null, fileSize: null, mime: null },
      reviewStatus: 'reviewed',
      adminProgress: 100,
      adminComment: '디자인 완성도가 높아요.',
      needsRevision: false,
      mode: 'self',
    },
    {
      key: 'visual',
      label: '비주얼<br>가이드',
      submission: { note: '톤앤매너, 색감 가이드', imageData: null, fileName: null, fileSize: null, mime: null },
      reviewStatus: 'reviewed',
      adminProgress: 100,
      adminComment: '가이드가 명확해요.',
      needsRevision: false,
      mode: 'self',
    },
    { key: 'background', label: '배경/장소', submission: { note: '주요 배경 60% 진행 중', imageData: null, fileName: null, fileSize: null, mime: null }, reviewStatus: null, adminProgress: null, adminComment: null, needsRevision: false, mode: 'self' },
    { key: 'storyboard', label: '콘티', submission: { note: '콘티 초안 35% 진행 중', imageData: null, fileName: null, fileSize: null, mime: null }, reviewStatus: null, adminProgress: null, adminComment: null, needsRevision: false, mode: 'self' },
    { key: 'art', label: '작화', submission: null, reviewStatus: null, adminProgress: null, adminComment: null, needsRevision: false, mode: 'self' },
    { key: 'lettering', label: '레터링/<br>검수', submission: null, reviewStatus: null, adminProgress: null, adminComment: null, needsRevision: false, mode: 'self' },
    { key: 'upload', label: '업로드/<br>연재', submission: null, reviewStatus: null, adminProgress: null, adminComment: null, needsRevision: false, mode: 'self' },
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

function mdFormatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

let currentIP = null;

function loadCurrentIP() {
  const stored = typeof bearipGetCurrentIP === 'function' ? bearipGetCurrentIP() : null;
  currentIP = stored || DEMO_IP;
  // Older IPs (created before the DNA breakdown feature) only have a single
  // dnaScore number — this seeds all 6 categories from it so nothing looks
  // broken, then the score itself becomes the derived average going forward.
  bearipEnsureDnaBreakdown(currentIP);
  // These three are fully derived from the roadmap now (not self-input), so
  // refresh them on every load in case ip-reviews.js or production-requests.js
  // changed the underlying roadmap data since this IP was last opened here.
  recomputeWritingCompleteness();
  recomputeExpertReadiness();
  recomputeProductionProgress();
}

function renderHeader() {
  document.getElementById('currentIpChipLabel').textContent = currentIP.title;

  const dnaBadge = document.getElementById('currentIpDnaBadge');
  if (dnaBadge) dnaBadge.textContent = `DNA ${currentIP.dnaScore || 0}%`;

  const thumbEl = document.getElementById('currentIpThumb');
  const iconEl = document.getElementById('currentIpThumbIcon');
  if (thumbEl && iconEl) {
    // An explicitly-set cover image wins; otherwise fall back to the first
    // image asset, so IPs created before this feature still show something.
    const imageAsset = (currentIP.assets || []).find((a) => a.imageData);
    const coverUrl = currentIP.coverImage || (imageAsset && imageAsset.imageData);
    if (coverUrl) {
      thumbEl.style.backgroundImage = `url('${coverUrl}')`;
      iconEl.style.display = 'none';
    } else {
      thumbEl.style.backgroundImage = '';
      iconEl.style.display = '';
    }
  }
}

async function changeCurrentIpCoverImage(file) {
  if (!file) return;
  if (file.size > BEARIP_MAX_ASSET_FILE_BYTES) {
    bearipShowToast('파일이 너무 커요 (최대 50MB)');
    return;
  }
  if (!(await bearipCheckStorageRoom(file.size))) {
    bearipShowToast('저장 공간이 부족해요. 다른 파일을 시도해보세요.');
    return;
  }
  try {
    const dataUrl = await bearipResizeImageToDataUrl(file, 800, 0.85);
    currentIP.coverImage = dataUrl;
    if (currentIP.id !== 'demo') bearipUpdateIP(currentIP.id, { coverImage: dataUrl });
    renderHeader();
    bearipShowToast('대표 이미지를 변경했어요');
  } catch (err) {
    bearipShowToast(err.message || '이미지를 불러오지 못했어요');
  }
}

function renderIpSwitcherMenu() {
  const menu = document.getElementById('ipSwitcherMenu');
  if (!menu) return;

  const myIPs = typeof bearipLoadIPs === 'function' ? bearipLoadIPs() : [];
  const rowsHtml = myIPs
    .map((ip) => {
      const isActive = ip.id === currentIP.id;
      const goalLabel = GOAL_LABELS[ip.goal] || '';
      return `
        <button type="button" class="md-ip-switcher-row${isActive ? ' active' : ''}" data-switch-ip="${ip.id}">
          <span class="dot"></span>
          <span class="info">
            <span class="t">${bearipEscapeHtml(ip.title || '제목 없는 IP')}</span>
            <span class="m">${goalLabel} · DNA ${ip.dnaScore || 0}%</span>
          </span>
        </button>
      `;
    })
    .join('');

  const emptyHtml = myIPs.length === 0 ? '<div class="md-ip-switcher-empty">아직 만든 IP가 없어요.</div>' : '';

  const isDemoActive = currentIP.id === 'demo';
  const demoRowHtml = `
    <button type="button" class="md-ip-switcher-row demo${isDemoActive ? ' active' : ''}" data-switch-ip="demo">
      <span class="dot"></span>
      <span class="info">
        <span class="t">서울 야행수선단 (예시)</span>
        <span class="m">둘러보기용 데모</span>
      </span>
    </button>
  `;

  menu.innerHTML = `
    ${emptyHtml}
    ${rowsHtml}
    ${demoRowHtml}
    <div class="md-ip-switcher-divider"></div>
    <a class="md-ip-switcher-new" href="new-ip.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      새 프로젝트 만들기
    </a>
    <a class="md-ip-switcher-manage" href="my-projects.html">전체 프로젝트 관리 →</a>
  `;

  menu.querySelectorAll('[data-switch-ip]').forEach((row) => {
    row.addEventListener('click', () => {
      const id = row.dataset.switchIp;
      if (id === currentIP.id) {
        closeIpSwitcher();
        return;
      }
      if (id === 'demo') {
        localStorage.removeItem('bearip_current_ip');
      } else {
        bearipSetCurrentId(id);
      }
      location.reload();
    });
  });
}

function openIpSwitcher() {
  renderIpSwitcherMenu();
  document.getElementById('ipSwitcherMenu').hidden = false;
  document.getElementById('ipSwitcher').classList.add('open');
}

function closeIpSwitcher() {
  const menu = document.getElementById('ipSwitcherMenu');
  if (menu) menu.hidden = true;
  const wrap = document.getElementById('ipSwitcher');
  if (wrap) wrap.classList.remove('open');
}

function renderPublishButton() {
  const btn = document.getElementById('mdPublishBtn');
  const label = document.getElementById('mdPublishBtnLabel');
  if (!btn || !label) return;

  if (currentIP.id === 'demo') {
    btn.classList.add('locked');
    btn.classList.remove('published');
    label.textContent = '이미 OPEN DNA에 공개돼 있어요';
    return;
  }
  btn.classList.remove('locked');
  const isPublic = currentIP.visibility === 'public';
  btn.classList.toggle('published', isPublic);
  label.textContent = isPublic ? '공개됨 · 비공개로 전환' : 'OPEN DNA에 공개하기';
}

function toggleIPVisibility() {
  if (currentIP.id === 'demo') return;
  if (!bearipRequireLogin('my-dna.html')) return;
  const nowPublic = currentIP.visibility !== 'public';
  currentIP.visibility = nowPublic ? 'public' : 'private';
  bearipUpdateIP(currentIP.id, { visibility: currentIP.visibility });
  renderPublishButton();
  if (nowPublic) {
    bearipAddNotification({
      type: 'ip',
      title: 'OPEN DNA에 공개됐어요',
      message: `'${currentIP.title}'가 OPEN DNA 갤러리에 공개됐어요.`,
      link: 'open-dna.html',
    });
    bearipShowToast('OPEN DNA에 공개됐어요. 갤러리에서 확인해보세요.');
  } else {
    bearipShowToast('비공개로 전환했어요.');
  }
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

const MD_GENRE_OPTIONS = ['무협', '판타지', 'SF', '미스터리', '로맨스', '드라마', '액션', '코미디', '호러'];

function renderGenreTags() {
  const wrap = document.getElementById('mdGenreTags');
  if (!wrap) return;
  const genres = currentIP.genres || [];
  wrap.innerHTML = genres.length
    ? genres
        .map(
          (g) => `
        <span class="md-genre-tag">#${bearipEscapeHtml(g)}<button type="button" class="md-genre-remove" data-genre="${bearipEscapeHtml(g)}" aria-label="태그 삭제">×</button></span>
      `
        )
        .join('')
    : '<span class="md-genre-empty">아직 장르 태그가 없어요.</span>';
  wrap.querySelectorAll('.md-genre-remove').forEach((btn) => {
    btn.addEventListener('click', () => toggleGenre(btn.dataset.genre));
  });
  renderGenrePicker();
}

function renderGenrePicker() {
  const picker = document.getElementById('mdGenrePicker');
  if (!picker) return;
  const genres = currentIP.genres || [];
  picker.innerHTML = MD_GENRE_OPTIONS.map(
    (g) => `<button type="button" class="md-genre-picker-chip${genres.includes(g) ? ' active' : ''}" data-genre="${g}">${g}</button>`
  ).join('');
  picker.querySelectorAll('.md-genre-picker-chip').forEach((btn) => {
    btn.addEventListener('click', () => toggleGenre(btn.dataset.genre));
  });
}

function toggleGenre(genre) {
  const genres = (currentIP.genres || []).slice();
  const idx = genres.indexOf(genre);
  if (idx === -1) genres.push(genre);
  else genres.splice(idx, 1);
  currentIP.genres = genres;
  if (currentIP.id !== 'demo') bearipUpdateIP(currentIP.id, { genres });
  renderGenreTags();
}

function renderStatus() {
  document.getElementById('dnaScoreValue').textContent = currentIP.dnaScore + '%';
  document.getElementById('dnaScoreBar').style.width = currentIP.dnaScore + '%';
  const steps = currentIP.roadmap || [];
  const registeredCount = steps.filter((s) => !!s.submission).length;
  document.getElementById('dnaScoreDesc').textContent = steps.length
    ? `개발 항목 ${registeredCount}/${steps.length}개 등록 · 눌러서 자세히 보기`
    : '눌러서 자세히 보기';

  document.getElementById('readinessValue').textContent = currentIP.readinessScore + '%';
  document.getElementById('readinessBar').style.width = currentIP.readinessScore + '%';
  document.getElementById('readinessDesc').textContent = `선택한 목표(${GOAL_LABELS[currentIP.goal]}) 준비도`;
  const commentEl = document.getElementById('readinessOverallComment');
  if (commentEl) {
    if (currentIP.overallReviewComment) {
      commentEl.textContent = `"${currentIP.overallReviewComment}"`;
      commentEl.hidden = false;
    } else {
      commentEl.hidden = true;
    }
  }

  const prodValueEl = document.getElementById('productionValue');
  const prodBarEl = document.getElementById('productionBar');
  if (currentIP.productionProgress == null) {
    prodValueEl.textContent = '아직 시작 전';
    prodBarEl.style.width = '0%';
  } else {
    prodValueEl.textContent = currentIP.productionProgress + '%';
    prodBarEl.style.width = currentIP.productionProgress + '%';
  }
}

function jumpToRoadmap() {
  const panel = document.getElementById('roadmapContainer').closest('.md-panel');
  if (!panel) return;
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  panel.classList.add('flash-highlight');
  setTimeout(() => panel.classList.remove('flash-highlight'), 900);
}

const MD_SCORE_LABELS = { dnaScore: 'DNA SCORE', readinessScore: 'READINESS SCORE (준비도)' };

// Older breakdown-average path (6 fixed categories) — kept as-is since other
// pages (OPEN DNA, CREW MATCH posts) still read ip.dnaBreakdown as a
// read-only report. Nothing on this page calls it anymore: 작성 완성도 below
// replaced it as the actual source of currentIP.dnaScore.
function recomputeDnaScore() {
  if (!currentIP.dnaBreakdown) return;
  currentIP.dnaScore = bearipRecomputeDnaScore(currentIP.dnaBreakdown);
}

// 작성 완성도 — replaces the old self-slider dnaScore with something the
// creator can't fudge: the % of this goal's roadmap items that actually
// have submitted material (new-ip.html's 1차 등록, or added later from MY
// DNA). Demo IP keeps its curated fixed numbers untouched.
function recomputeWritingCompleteness() {
  if (currentIP.id === 'demo') return;
  const steps = currentIP.roadmap || [];
  currentIP.dnaScore = steps.length ? Math.round((steps.filter((s) => !!s.submission).length / steps.length) * 100) : 0;
  bearipUpdateIP(currentIP.id, { dnaScore: currentIP.dnaScore });
}

function ensureWritingCompletenessOverlay() {
  let overlay = document.getElementById('writingCompletenessOverlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'md-road-edit-overlay';
  overlay.id = 'writingCompletenessOverlay';
  overlay.style.display = 'none';
  overlay.innerHTML = `
    <div class="md-road-edit-box">
      <div class="md-road-edit-head">
        <span>작성 완성도</span>
        <button type="button" class="md-road-edit-close" id="writingCompletenessClose" aria-label="닫기">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <p class="md-wc-note">개발 항목마다 자료를 등록했는지로 자동 계산돼요.</p>
      <div class="md-wc-list" id="writingCompletenessBody"></div>
    </div>
  `;
  (document.querySelector('.dna-app') || document.body).appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('#writingCompletenessClose')) overlay.style.display = 'none';
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display !== 'none') overlay.style.display = 'none';
  });
  return overlay;
}

function openWritingCompletenessView() {
  const overlay = ensureWritingCompletenessOverlay();
  const body = document.getElementById('writingCompletenessBody');
  body.innerHTML = (currentIP.roadmap || [])
    .map((s) => {
      const done = !!s.submission;
      return `<div class="md-wc-row"><span>${s.label.replace(/<br>/g, ' ')}</span><span class="md-wc-flag${done ? ' done' : ''}">${done ? '등록됨' : '미등록'}</span></div>`;
    })
    .join('');
  overlay.style.display = 'flex';
}

// 전문가 준비도 — average of the page-admin's per-step adminProgress across
// only the steps that have actually been reviewed (an un-reviewed step
// doesn't drag the average toward 0). 0 with nothing reviewed yet.
function recomputeExpertReadiness() {
  if (currentIP.id === 'demo') return;
  const reviewed = (currentIP.roadmap || []).filter((s) => s.reviewStatus === 'reviewed' && s.adminProgress != null);
  currentIP.readinessScore = reviewed.length ? Math.round(reviewed.reduce((sum, s) => sum + s.adminProgress, 0) / reviewed.length) : 0;
  bearipUpdateIP(currentIP.id, { readinessScore: currentIP.readinessScore });
}

// 제작 진행률 — only counts steps that have actually entered production
// (제작 의뢰 중/완료 mode); null (rendered as "아직 시작 전") until at least
// one step has been requested, since 0% would misleadingly read as "started
// but going nowhere."
function recomputeProductionProgress() {
  if (currentIP.id === 'demo') return;
  const steps = currentIP.roadmap || [];
  const active = steps.filter((s) => s.mode === 'requested' || s.mode === 'done');
  currentIP.productionProgress = active.length ? Math.round((steps.filter((s) => s.mode === 'done').length / active.length) * 100) : null;
  bearipUpdateIP(currentIP.id, { productionProgress: currentIP.productionProgress });
}

function ensureDnaReportOverlay() {
  let overlay = document.getElementById('dnaReportOverlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'md-road-edit-overlay';
  overlay.id = 'dnaReportOverlay';
  overlay.style.display = 'none';
  overlay.innerHTML = `
    <div class="md-road-edit-box md-dna-report-box">
      <div class="md-road-edit-head">
        <span>IP DNA 현황</span>
        <button type="button" class="md-road-edit-close" id="dnaReportClose" aria-label="닫기">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <div class="md-dna-report-body">
        <div class="md-dna-tiles" id="dnaReportTiles"></div>
        <div class="md-dna-score-panel">
          <div class="md-dna-score-ring" id="dnaReportRing">
            <div class="md-dna-score-ring-inner">
              <span class="v" id="dnaReportScoreValue">0%</span>
              <span class="t" id="dnaReportScoreTier">-</span>
            </div>
          </div>
          <p class="md-dna-score-hint">6개 항목의 평균으로 자동 계산돼요.<br>항목을 눌러 값을 조정해보세요.</p>
        </div>
      </div>
    </div>
  `;
  (document.querySelector('.dna-app') || document.body).appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('#dnaReportClose')) closeDnaReport();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display !== 'none') closeDnaReport();
  });
  document.getElementById('dnaReportTiles').addEventListener('click', (e) => {
    const prodBtn = e.target.closest('.md-production-btn');
    if (prodBtn) {
      e.stopPropagation();
      if (prodBtn.classList.contains('cancel')) {
        mdCancelProductionRequest('dna', prodBtn.dataset.key);
      } else {
        const cat = BEARIP_DNA_CATEGORIES.find((c) => c.key === prodBtn.dataset.key);
        openProductionRequest('dna', prodBtn.dataset.key, cat ? cat.label : prodBtn.dataset.key, BEARIP_DNA_PRODUCTION_PRICE[prodBtn.dataset.key] || 0);
      }
      return;
    }
    const tile = e.target.closest('.md-dna-tile');
    if (tile) openScoreEdit('bd:' + tile.dataset.key);
  });
  return overlay;
}

function closeDnaReport() {
  const overlay = document.getElementById('dnaReportOverlay');
  if (overlay) overlay.style.display = 'none';
}

// ---- 제작요청 — pay credits to have a DNA category or roadmap step made
// instead of self-producing it. Shared by both surfaces via `scope`
// ('dna' | 'roadmap'), since the request/cancel/pay flow is identical —
// only which store the mode is written back to differs.
function mdProductionRowHtml(scope, key, mode, price) {
  // 'done' is set from the 제작요청 관리 admin page (production-requests.js)
  // once a request is fulfilled — nothing left to cancel or re-request here.
  if (mode === 'done') {
    return `
      <div class="md-production-row done">
        <span class="md-production-tag done">제작 완료</span>
      </div>`;
  }
  if (mode === 'requested') {
    return `
      <div class="md-production-row requested">
        <span class="md-production-tag requested">제작 요청됨 · 검토 대기</span>
        <button type="button" class="md-production-btn cancel" data-scope="${scope}" data-key="${key}">자체제작으로 전환</button>
      </div>`;
  }
  return `
    <div class="md-production-row">
      <span class="md-production-tag self">자체제작 중</span>
      <button type="button" class="md-production-btn request" data-scope="${scope}" data-key="${key}">제작요청 · ${price}C</button>
    </div>`;
}

function ensureAdminReviewViewOverlay() {
  let overlay = document.getElementById('adminReviewViewOverlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'md-road-edit-overlay';
  overlay.id = 'adminReviewViewOverlay';
  overlay.style.display = 'none';
  overlay.innerHTML = `
    <div class="md-road-edit-box">
      <div class="md-road-edit-head">
        <span id="adminReviewViewTitle"></span>
        <button type="button" class="md-road-edit-close" id="adminReviewViewClose" aria-label="닫기">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <div class="md-admin-review-body" id="adminReviewViewBody"></div>
    </div>
  `;
  (document.querySelector('.dna-app') || document.body).appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('#adminReviewViewClose')) closeAdminReviewView();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display !== 'none') closeAdminReviewView();
  });
  return overlay;
}

function closeAdminReviewView() {
  const overlay = document.getElementById('adminReviewViewOverlay');
  if (overlay) overlay.style.display = 'none';
}

function openAdminReviewView(stepKey) {
  const step = (currentIP.roadmap || []).find((s) => s.key === stepKey);
  if (!step || !step.submission) return;
  const overlay = ensureAdminReviewViewOverlay();
  overlay.parentNode.appendChild(overlay);
  document.getElementById('adminReviewViewTitle').textContent = step.label.replace(/<br>/g, ' ');

  const sub = step.submission;
  const previewHtml = sub.imageData
    ? `<div class="md-admin-review-thumb" style="background-image:url('${sub.imageData}')"></div>`
    : sub.fileName
      ? `<div class="md-admin-review-file">${bearipEscapeHtml(sub.fileName)}${sub.fileSize ? ` · ${mdFormatFileSize(sub.fileSize)}` : ''}</div>`
      : '';
  const noteHtml = sub.note ? `<p class="md-admin-review-note">${bearipEscapeHtml(sub.note)}</p>` : '';

  const resultHtml =
    step.reviewStatus === 'reviewed'
      ? `
        <div class="md-admin-review-score">전문가 준비도 <b>${step.adminProgress}%</b>${step.needsRevision ? ' <span class="md-admin-review-flag">보완 필요</span>' : ''}</div>
        ${step.adminComment ? `<p class="md-admin-review-comment">"${bearipEscapeHtml(step.adminComment)}"</p>` : ''}
      `
      : `<div class="md-admin-review-waiting">담당 IP 매니저가 아직 확인 전이에요.</div>`;

  document.getElementById('adminReviewViewBody').innerHTML = `
    <div class="md-admin-review-submission">
      ${previewHtml}
      ${noteHtml}
    </div>
    ${resultHtml}
  `;
  overlay.style.display = 'flex';
}

function mdSetDnaProductionMode(key, mode) {
  currentIP.dnaProductionMode = Object.assign({}, currentIP.dnaProductionMode, { [key]: mode });
  if (currentIP.id !== 'demo') bearipUpdateIP(currentIP.id, { dnaProductionMode: currentIP.dnaProductionMode });
}

function mdSetRoadmapProductionMode(key, mode) {
  const step = (currentIP.roadmap || []).find((s) => s.key === key);
  if (!step) return;
  step.mode = mode;
  if (currentIP.id !== 'demo') bearipUpdateIP(currentIP.id, { roadmap: currentIP.roadmap });
}

// Switching back to 자체제작 refunds the credit — nothing was actually
// delivered, so there's nothing to keep the payment for.
function mdCancelProductionRequest(scope, key) {
  const price = scope === 'dna' ? BEARIP_DNA_PRODUCTION_PRICE[key] || 0 : BEARIP_ROADMAP_STEP_PRICE[key] || 0;
  bearipAddCredits(price);
  const pending = bearipLoadProductionRequests().find(
    (r) => r.ipId === currentIP.id && r.scope === scope && r.key === key && r.status === 'pending'
  );
  if (pending) bearipUpdateProductionRequest(pending.id, { status: 'cancelled' });
  if (scope === 'dna') {
    mdSetDnaProductionMode(key, 'self');
    renderDnaReportTiles();
  } else {
    mdSetRoadmapProductionMode(key, 'self');
    recomputeProductionProgress();
    renderRoadmap();
    renderStatus();
  }
  if (typeof bearipRefreshCreditDisplays === 'function') bearipRefreshCreditDisplays();
  if (typeof renderProductionRequestsList === 'function') renderProductionRequestsList();
  bearipShowToast(`자체제작으로 전환했어요. ${price}C를 환불했어요.`);
}

let productionRequestPending = null;

function updateProductionRequestPayState() {
  if (!productionRequestPending) return;
  const balance = bearipGetCredits();
  const enough = balance >= productionRequestPending.price;
  const payBtn = document.getElementById('productionRequestPayBtn');
  const topupLink = document.getElementById('productionRequestTopup');
  const balanceEl = document.getElementById('productionRequestBalance');
  if (balanceEl) balanceEl.textContent = balance + 'C';
  if (payBtn) {
    payBtn.disabled = !enough;
    payBtn.textContent = enough ? '결제하고 요청하기' : '크레딧이 부족해요';
  }
  if (topupLink) topupLink.hidden = enough;
}

// bearipRefreshCreditDisplays (auth-ui.js) calls this after a top-up so a
// 제작요청 modal left open mid-충전 (via its own "충전하러 가기" link)
// re-enables its pay button without needing to be closed and reopened.
function mdRefreshProductionBalance() {
  const overlay = document.getElementById('productionRequestOverlay');
  if (!overlay || overlay.style.display === 'none') return;
  updateProductionRequestPayState();
}

function ensureProductionRequestOverlay() {
  let overlay = document.getElementById('productionRequestOverlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'md-road-edit-overlay';
  overlay.id = 'productionRequestOverlay';
  overlay.style.display = 'none';
  overlay.innerHTML = `
    <div class="md-road-edit-box md-production-request-box">
      <div class="md-road-edit-head">
        <span>제작 요청</span>
        <button type="button" class="md-road-edit-close" id="productionRequestClose" aria-label="닫기">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <p class="md-production-request-desc" id="productionRequestDesc"></p>
      <label class="md-production-request-detail-label" for="productionRequestDetail">요청 세부사항 (선택)</label>
      <textarea id="productionRequestDetail" class="md-production-request-detail" placeholder="원하는 스타일, 참고 자료, 꼭 반영됐으면 하는 부분 등을 자유롭게 적어주세요."></textarea>
      <div class="md-production-request-price">
        <span class="lbl">결제 크레딧</span>
        <span class="val" id="productionRequestPrice">0C</span>
      </div>
      <div class="md-production-request-balance">보유 크레딧 <span id="productionRequestBalance" class="bearip-credit-balance-display">0C</span></div>
      <button type="button" class="md-production-request-pay" id="productionRequestPayBtn">결제하고 요청하기</button>
      <a href="#" class="md-production-request-topup" id="productionRequestTopup" hidden>크레딧 충전하러 가기 →</a>
    </div>
  `;
  // Appended inside .dna-app (not just body) so it inherits --dr-* theme
  // variables — see ensureDnaReportOverlay/ensureStepMaterialOverlay above.
  (document.querySelector('.dna-app') || document.body).appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('#productionRequestClose')) closeProductionRequest();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display !== 'none') closeProductionRequest();
  });
  document.getElementById('productionRequestTopup').addEventListener('click', (e) => {
    e.preventDefault();
    closeProductionRequest();
    if (typeof bearipOpenCreditTopup === 'function') bearipOpenCreditTopup();
  });
  document.getElementById('productionRequestPayBtn').addEventListener('click', () => {
    if (!productionRequestPending) return;
    const { scope, key, price, label } = productionRequestPending;
    if (!bearipSpendCredits(price)) return;
    const detailInput = document.getElementById('productionRequestDetail');
    const detail = detailInput ? detailInput.value.trim() : '';
    if (scope === 'dna') {
      mdSetDnaProductionMode(key, 'requested');
      renderDnaReportTiles();
    } else {
      mdSetRoadmapProductionMode(key, 'requested');
      recomputeProductionProgress();
      renderRoadmap();
      renderStatus();
    }
    bearipAddProductionRequest({
      id: 'preq_' + Date.now(),
      ipId: currentIP.id,
      ipTitle: currentIP.title || '제목 없는 IP',
      scope,
      key,
      label,
      price,
      detail,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    });
    bearipAddNotification({
      type: 'production',
      title: '제작을 요청했어요',
      message: `'${currentIP.title || '제목 없는 IP'}'의 '${label}' 파트 제작을 요청했어요. ${price}C가 결제됐어요.`,
      link: 'my-dna.html',
    });
    if (typeof bearipRefreshCreditDisplays === 'function') bearipRefreshCreditDisplays();
    if (typeof renderProductionRequestsList === 'function') renderProductionRequestsList();
    closeProductionRequest();
    bearipShowToast(`제작을 요청했어요. ${price}C가 결제됐어요.`);
  });
  return overlay;
}

function closeProductionRequest() {
  const overlay = document.getElementById('productionRequestOverlay');
  if (overlay) overlay.style.display = 'none';
  productionRequestPending = null;
}

function openProductionRequest(scope, key, label, price) {
  const overlay = ensureProductionRequestOverlay();
  productionRequestPending = { scope, key, price, label };
  document.getElementById('productionRequestDesc').textContent = `'${label}' 파트를 전문가에게 제작 요청할까요?`;
  document.getElementById('productionRequestPrice').textContent = price + 'C';
  const detailInput = document.getElementById('productionRequestDetail');
  if (detailInput) detailInput.value = '';
  updateProductionRequestPayState();
  overlay.style.display = 'flex';
}

function mdFormatRelativeTime(iso) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

const MD_PRODUCTION_STATUS_LABEL = { pending: '검토 대기', cancelled: '취소됨', done: '완료', rejected: '거절됨' };

// The "제작요청" tab's history list — every request/cancel this IP has
// gone through, newest first, so the user can check what they asked for
// (and the detail text they sent) without having to remember it.
function renderProductionRequestsList() {
  const wrap = document.getElementById('productionRequestsList');
  if (!wrap) return;
  const requests = (typeof bearipLoadProductionRequests === 'function' ? bearipLoadProductionRequests() : [])
    .filter((r) => r.ipId === currentIP.id);

  if (!requests.length) {
    wrap.innerHTML = `
      <div class="md-production-list-empty">
        아직 요청한 제작이 없어요.<br>
        DNA 현황이나 개발 맵의 '제작요청' 버튼으로 전문가에게 맡겨보세요.
      </div>`;
    return;
  }

  wrap.innerHTML = requests
    .map((r) => `
      <div class="md-production-list-item">
        <div class="md-production-list-row">
          <span class="md-production-list-label">${bearipEscapeHtml(r.label)}</span>
          <span class="md-production-list-status ${r.status}">${MD_PRODUCTION_STATUS_LABEL[r.status] || r.status}</span>
        </div>
        <div class="md-production-list-meta">
          <span>${r.price}C</span>
          <span>${mdFormatRelativeTime(r.requestedAt)}</span>
        </div>
        ${r.detail ? `<div class="md-production-list-detail">"${bearipEscapeHtml(r.detail)}"</div>` : ''}
        ${r.resultNote ? `<div class="md-production-list-result"><span>완료 메모</span>${bearipEscapeHtml(r.resultNote)}</div>` : ''}
      </div>
    `)
    .join('');
}

function mdDnaProductionMode(key) {
  return (currentIP.dnaProductionMode && currentIP.dnaProductionMode[key]) || 'self';
}

function renderDnaReportTiles() {
  const wrap = document.getElementById('dnaReportTiles');
  if (!wrap) return;
  wrap.innerHTML = BEARIP_DNA_CATEGORIES.map((cat, i) => {
    const value = (currentIP.dnaBreakdown && currentIP.dnaBreakdown[cat.key]) || 0;
    const mode = mdDnaProductionMode(cat.key);
    const price = BEARIP_DNA_PRODUCTION_PRICE[cat.key] || 0;
    return `
      <div class="md-dna-tile" data-key="${cat.key}" tabindex="0">
        <div class="md-dna-tile-ic">${cat.icon}</div>
        <div class="md-dna-tile-num">0${i + 1}</div>
        <div class="md-dna-tile-label">${cat.label}</div>
        <div class="md-dna-tile-value">${value}%</div>
        <div class="md-dna-tile-tip">${bearipDnaTip(cat.key, value)}</div>
        ${mdProductionRowHtml('dna', cat.key, mode, price)}
      </div>
    `;
  }).join('');
  const scoreValueEl = document.getElementById('dnaReportScoreValue');
  const scoreTierEl = document.getElementById('dnaReportScoreTier');
  if (scoreValueEl) scoreValueEl.textContent = currentIP.dnaScore + '%';
  if (scoreTierEl) scoreTierEl.textContent = bearipDnaScoreTier(currentIP.dnaScore);
  const ring = document.getElementById('dnaReportRing');
  if (ring) ring.style.setProperty('--p', currentIP.dnaScore);
}

function openDnaReport() {
  const overlay = ensureDnaReportOverlay();
  renderDnaReportTiles();
  overlay.style.display = 'flex';
}

// Manual, creator-set score for now — the field itself (currentIP.dnaScore /
// readinessScore) is a plain number, so a future 관리자 승인 flow or AI
// evaluation can fill the same field later without changing this UI's data
// model, just which code path writes to it.
function ensureScoreEditOverlay() {
  let overlay = document.getElementById('scoreEditOverlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'md-road-edit-overlay';
  overlay.id = 'scoreEditOverlay';
  overlay.style.display = 'none';
  overlay.innerHTML = `
    <div class="md-road-edit-box">
      <div class="md-road-edit-head">
        <span id="scoreEditTitle"></span>
        <button type="button" class="md-road-edit-close" id="scoreEditClose" aria-label="닫기">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <div class="md-score-edit-body">
        <div class="md-score-edit-value" id="scoreEditValue">0%</div>
        <input type="range" min="0" max="100" step="1" id="scoreEditSlider">
        <p class="md-score-edit-note">직접 설정한 값이에요. 언제든 다시 조정할 수 있어요.</p>
      </div>
    </div>
  `;
  (document.querySelector('.dna-app') || document.body).appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('#scoreEditClose')) closeScoreEdit();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display !== 'none') closeScoreEdit();
  });
  const slider = document.getElementById('scoreEditSlider');
  slider.addEventListener('input', () => {
    document.getElementById('scoreEditValue').textContent = slider.value + '%';
  });
  slider.addEventListener('change', () => {
    const field = overlay.dataset.field;
    const value = parseInt(slider.value, 10);
    if (field.startsWith('bd:')) {
      const key = field.slice(3);
      currentIP.dnaBreakdown[key] = value;
      recomputeDnaScore();
      if (currentIP.id !== 'demo') bearipUpdateIP(currentIP.id, { dnaBreakdown: currentIP.dnaBreakdown, dnaScore: currentIP.dnaScore });
      renderDnaReportTiles();
    } else {
      currentIP[field] = value;
      if (currentIP.id !== 'demo') bearipUpdateIP(currentIP.id, { [field]: value });
    }
    renderStatus();
    bearipShowToast('설정을 저장했어요');
  });
  return overlay;
}

function closeScoreEdit() {
  const overlay = document.getElementById('scoreEditOverlay');
  if (overlay) overlay.style.display = 'none';
}

function openScoreEdit(field) {
  const overlay = ensureScoreEditOverlay();
  // Always bump the overlay to the end of the DOM so it paints above the
  // DNA report overlay when a breakdown tile opens it on top.
  overlay.parentNode.appendChild(overlay);
  overlay.dataset.field = field;
  let label;
  let current;
  if (field.startsWith('bd:')) {
    const key = field.slice(3);
    const cat = BEARIP_DNA_CATEGORIES.find((c) => c.key === key);
    label = cat ? cat.label : key;
    current = (currentIP.dnaBreakdown && currentIP.dnaBreakdown[key]) || 0;
  } else {
    label = MD_SCORE_LABELS[field];
    current = currentIP[field] || 0;
  }
  document.getElementById('scoreEditTitle').textContent = `${label} 설정`;
  const slider = document.getElementById('scoreEditSlider');
  slider.value = current;
  document.getElementById('scoreEditValue').textContent = slider.value + '%';
  overlay.style.display = 'flex';
}

// Unified per-step status — a step used to be able to show a self-declared
// progress %, an admin review badge, AND a 제작요청 row all at once, which
// could look contradictory (e.g. "완료" next to "제작요청됨"). Production
// (일단 제작에 들어갔으면) always wins; otherwise expert review; otherwise
// however far the creator's own 1차 등록 has gotten.
function mdStepStatus(step) {
  if (step.mode === 'done') return 'production_done';
  if (step.mode === 'requested') return 'production_requested';
  if (step.reviewStatus === 'reviewed') return step.needsRevision ? 'needs_revision' : 'ready';
  if (step.reviewStatus === 'requested') return 'reviewing';
  if (step.submission) return 'writing';
  return 'unregistered';
}

const STEP_STATUS_META = {
  unregistered: { label: '미등록', cls: 'unregistered', btn: '자료 등록' },
  writing: { label: '작성 중', cls: 'writing', btn: '계속 작성' },
  reviewing: { label: '전문가 검토 중', cls: 'reviewing', btn: '검토 현황' },
  needs_revision: { label: '보완 필요', cls: 'needs-revision', btn: '의견 확인' },
  ready: { label: '준비 완료', cls: 'ready', btn: '제작 의뢰' },
  production_requested: { label: '제작 의뢰 중', cls: 'production', btn: '진행 상황 확인' },
  production_done: { label: '제작 완료', cls: 'done', btn: '결과물 보기' },
};

function renderRoadmap() {
  document.getElementById('roadmapTitle').textContent = `${GOAL_LABELS[currentIP.goal]} 개발 맵`;
  document.getElementById('roadmapGoalBadge').textContent = `선택한 목표: ${GOAL_LABELS[currentIP.goal]}`;
  document.getElementById('needsHint').textContent = `(${GOAL_LABELS[currentIP.goal]} 목표 기준)`;

  const container = document.getElementById('roadmapContainer');
  container.innerHTML = '';
  currentIP.roadmap.forEach((step, i) => {
    const statusKey = mdStepStatus(step);
    const meta = STEP_STATUS_META[statusKey];
    const stepEl = document.createElement('div');
    stepEl.className = 'md-road-step ' + meta.cls;
    stepEl.dataset.index = i;

    const isDoneLike = statusKey === 'ready' || statusKey === 'production_done';
    const checkHtml = isDoneLike ? `<span class="md-road-check">${CHECK_SVG}</span>` : '';

    stepEl.innerHTML = `
      <div class="md-road-ic-wrap">
        <div class="md-road-ic">${ROAD_ICONS[step.key] || ''}</div>
        ${checkHtml}
      </div>
      <div class="md-road-name">${step.label}</div>
      <div class="md-road-status">${meta.label}</div>
      <button type="button" class="md-road-action-btn ${meta.cls}" data-index="${i}" data-status="${statusKey}">${meta.btn}</button>
    `;
    container.appendChild(stepEl);
    if (i < currentIP.roadmap.length - 1) {
      container.insertAdjacentHTML('beforeend', ARROW_HTML);
    }
  });

  updateRequestReviewButton();
}

// ---- 개발 항목 자료 등록/수정 — the same 1차 등록 UI new-ip.html's step 4
// uses, just reachable per-step from MY DNA after the IP already exists
// (미등록/작성 중 steps only; once 전문가 검토 요청 is sent the step's button
// switches to a read-only view instead, so this never edits under a
// reviewer's feet).
let stepMaterialIndex = null;

function ensureStepMaterialOverlay() {
  let overlay = document.getElementById('stepMaterialOverlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'md-road-edit-overlay';
  overlay.id = 'stepMaterialOverlay';
  overlay.style.display = 'none';
  overlay.innerHTML = `
    <div class="md-road-edit-box">
      <div class="md-road-edit-head">
        <span id="stepMaterialTitle"></span>
        <button type="button" class="md-road-edit-close" id="stepMaterialClose" aria-label="닫기">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <div class="md-step-material-body">
        <div class="md-step-material-upload" id="stepMaterialUpload">
          <input type="file" id="stepMaterialInput" accept="image/*,video/*,.pdf,.doc,.docx,.txt" style="display:none">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 15l5-5 4 4 4-4 5 5"/><circle cx="8" cy="9" r="1.4"/></svg>
          <div class="t" id="stepMaterialUploadText">클릭해서 파일 업로드</div>
          <div class="d" id="stepMaterialUploadHint">이미지, 영상, 문서 — 최대 50MB</div>
        </div>
        <textarea class="md-step-material-note" id="stepMaterialNote" placeholder="간단한 설명이나 메모 (선택)" maxlength="200"></textarea>
        <button type="button" class="md-step-material-save" id="stepMaterialSave">저장</button>
      </div>
    </div>
  `;
  (document.querySelector('.dna-app') || document.body).appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('#stepMaterialClose')) {
      closeStepMaterialEditor();
      return;
    }
    if (e.target.closest('#stepMaterialUpload')) {
      document.getElementById('stepMaterialInput').click();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display !== 'none') closeStepMaterialEditor();
  });

  document.getElementById('stepMaterialInput').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const uploadEl = document.getElementById('stepMaterialUpload');
    if (file.size > BEARIP_MAX_ASSET_FILE_BYTES) {
      bearipShowToast('파일이 너무 커요 (최대 50MB)');
      return;
    }
    if (!(await bearipCheckStorageRoom(file.size))) {
      bearipShowToast('저장 공간이 부족해요. 다른 파일을 시도해보세요.');
      return;
    }
    const pending = { fileName: file.name, fileSize: file.size, mime: file.type, imageData: null };
    if (file.type.startsWith('image/')) {
      try {
        pending.imageData = await bearipResizeImageToDataUrl(file, 720, 0.85);
      } catch (err) {
        bearipShowToast(err.message || '이미지를 불러오지 못했어요');
        return;
      }
    }
    overlay.dataset.pendingFile = JSON.stringify(pending);
    uploadEl.classList.add('has-file');
    uploadEl.style.backgroundImage = pending.imageData ? `url('${pending.imageData}')` : '';
    document.getElementById('stepMaterialUploadText').textContent = file.name;
    document.getElementById('stepMaterialUploadHint').textContent = '다른 파일을 선택하려면 클릭하세요';
  });

  document.getElementById('stepMaterialSave').addEventListener('click', () => {
    if (stepMaterialIndex === null) return;
    const step = currentIP.roadmap[stepMaterialIndex];
    const note = document.getElementById('stepMaterialNote').value.trim();
    const pendingRaw = overlay.dataset.pendingFile;
    const pending = pendingRaw ? JSON.parse(pendingRaw) : null;
    const existing = step.submission;
    const fileFields = pending || existing || {};
    if (!pending && !existing && !note) {
      bearipShowToast('파일이나 메모를 하나는 등록해주세요');
      return;
    }
    step.submission = {
      imageData: fileFields.imageData || null,
      fileName: fileFields.fileName || null,
      fileSize: fileFields.fileSize || null,
      mime: fileFields.mime || null,
      note,
    };
    if (currentIP.id !== 'demo') bearipUpdateIP(currentIP.id, { roadmap: currentIP.roadmap });
    recomputeWritingCompleteness();
    renderRoadmap();
    renderStatus();
    closeStepMaterialEditor();
    bearipShowToast('자료를 등록했어요');
  });

  return overlay;
}

function closeStepMaterialEditor() {
  const overlay = document.getElementById('stepMaterialOverlay');
  if (overlay) {
    overlay.style.display = 'none';
    delete overlay.dataset.pendingFile;
  }
  stepMaterialIndex = null;
}

function openStepMaterialEditor(index) {
  const step = currentIP.roadmap[index];
  if (!step) return;
  const overlay = ensureStepMaterialOverlay();
  overlay.parentNode.appendChild(overlay);
  delete overlay.dataset.pendingFile;
  stepMaterialIndex = index;
  document.getElementById('stepMaterialTitle').textContent = step.label.replace(/<br>/g, ' ');

  const uploadEl = document.getElementById('stepMaterialUpload');
  const sub = step.submission;
  uploadEl.classList.toggle('has-file', !!(sub && (sub.imageData || sub.fileName)));
  uploadEl.style.backgroundImage = sub && sub.imageData ? `url('${sub.imageData}')` : '';
  document.getElementById('stepMaterialUploadText').textContent = sub && sub.fileName ? sub.fileName : '클릭해서 파일 업로드';
  document.getElementById('stepMaterialUploadHint').textContent =
    sub && (sub.imageData || sub.fileName) ? '다른 파일을 선택하려면 클릭하세요' : '이미지, 영상, 문서 — 최대 50MB';
  document.getElementById('stepMaterialNote').value = (sub && sub.note) || '';
  document.getElementById('stepMaterialInput').value = '';

  overlay.style.display = 'flex';
}

// ---- 전문가 검토 요청 — batches every step that has material but hasn't
// been sent yet (reviewStatus null) into one bearip_ip_reviews entry each,
// same shape new-ip.html used to create automatically at IP creation. Now
// it's a separate, deliberate action so nothing half-finished gets sent by
// accident.
function mdStepsAwaitingRequest() {
  return (currentIP.roadmap || []).filter((s) => !!s.submission && !s.reviewStatus);
}

function updateRequestReviewButton() {
  const btn = document.getElementById('mdRequestReviewBtn');
  if (!btn) return;
  const count = mdStepsAwaitingRequest().length;
  btn.hidden = count === 0;
  btn.textContent = count ? `전문가 검토 요청 (${count})` : '전문가 검토 요청';
}

function mdRequestExpertReview() {
  const steps = mdStepsAwaitingRequest();
  if (!steps.length) return;
  const requestedAt = new Date().toISOString();
  steps.forEach((step) => {
    step.reviewStatus = 'requested';
    bearipAddIpReview({
      id: 'ipreview_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      ipId: currentIP.id,
      ipTitle: currentIP.title,
      stepKey: step.key,
      stepLabel: step.label.replace(/<br>/g, ' '),
      submission: step.submission,
      requestedAt,
      status: 'pending',
      adminProgress: null,
      adminComment: null,
      needsRevision: false,
      reviewedAt: null,
    });
  });
  if (currentIP.id !== 'demo') bearipUpdateIP(currentIP.id, { roadmap: currentIP.roadmap });
  bearipAddNotification({
    type: 'ip',
    title: '전문가 검토를 요청했어요',
    message: `'${currentIP.title}'의 ${steps.length}개 항목을 담당 IP 매니저에게 전달했어요.`,
    link: 'my-dna.html',
  });
  renderRoadmap();
  bearipShowToast('전문가 검토를 요청했어요');
}

// ---- Asset folders — a free-form, user-created grouping on top of the
// fixed type filter. Nothing is pre-seeded; the row starts out as just
// "전체 자산" and only grows as the user names folders themselves.
let currentFolderFilter = 'all';
let addingFolder = false;

function mdGetFolders() {
  return currentIP.folders || [];
}

function mdAddFolder(name) {
  const folder = { id: 'folder_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), name };
  currentIP.folders = [...(currentIP.folders || []), folder];
  if (currentIP.id !== 'demo') bearipUpdateIP(currentIP.id, { folders: currentIP.folders });
  return folder;
}

function mdDeleteFolder(folderId) {
  currentIP.folders = (currentIP.folders || []).filter((f) => f.id !== folderId);
  // Ungroups the assets rather than deleting them — a tidy-up shouldn't cost content.
  currentIP.assets = (currentIP.assets || []).map((a) => (a.folderId === folderId ? { ...a, folderId: null } : a));
  if (currentIP.id !== 'demo') bearipUpdateIP(currentIP.id, { folders: currentIP.folders, assets: currentIP.assets });
}

function mdSetAssetFolder(index, folderId) {
  const assets = currentIP.assets || [];
  if (!assets[index]) return;
  assets[index] = Object.assign({}, assets[index], { folderId: folderId || null });
  currentIP.assets = assets;
  if (currentIP.id !== 'demo') bearipUpdateIP(currentIP.id, { assets: currentIP.assets });
}

// Combines the folder view with the existing type filter — a folder chip
// narrows *which* assets are visible, the type pills further narrow within that.
function applyAssetFilters() {
  const typeBtn = document.querySelector('.md-asset-filter-row .md-pill-btn.active');
  const type = typeBtn ? typeBtn.dataset.assetType : 'all';
  document.querySelectorAll('#assetsRow .md-asset-card').forEach((card) => {
    const typeMatch = type === 'all' || card.dataset.type === type;
    const folderMatch = currentFolderFilter === 'all' || card.dataset.folderId === currentFolderFilter;
    card.style.display = typeMatch && folderMatch ? '' : 'none';
  });
}

function renderFolderRow() {
  const row = document.getElementById('assetFolderRow');
  if (!row) return;
  const folders = mdGetFolders();
  const chipsHtml = folders
    .map(
      (f) => `
      <button type="button" class="md-folder-chip${currentFolderFilter === f.id ? ' active' : ''}" data-folder-id="${f.id}">
        <span class="name">${bearipEscapeHtml(f.name)}</span>
        <span class="md-folder-remove" data-remove-folder="${f.id}" title="폴더 삭제 (자산은 유지돼요)">×</span>
      </button>
    `
    )
    .join('');
  const addHtml = addingFolder
    ? `<span class="md-folder-add-form">
         <input type="text" id="folderNameInput" placeholder="폴더 이름" maxlength="20">
         <button type="button" id="folderAddConfirm">추가</button>
         <button type="button" id="folderAddCancel">취소</button>
       </span>`
    : `<button type="button" class="md-folder-add-btn" id="folderAddBtn">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
         폴더 추가
       </button>`;
  row.innerHTML = `
    <button type="button" class="md-folder-chip${currentFolderFilter === 'all' ? ' active' : ''}" data-folder-id="all">전체 자산</button>
    ${chipsHtml}
    ${addHtml}
  `;
  if (addingFolder) {
    const input = document.getElementById('folderNameInput');
    input.focus();
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmAddFolder();
      if (e.key === 'Escape') {
        addingFolder = false;
        renderFolderRow();
      }
    });
  }
}

function confirmAddFolder() {
  const input = document.getElementById('folderNameInput');
  const name = input.value.trim();
  if (!name) {
    input.focus();
    return;
  }
  const folder = mdAddFolder(name);
  addingFolder = false;
  currentFolderFilter = folder.id;
  renderFolderRow();
  renderAssets();
}

// Delegated so re-rendering the row's innerHTML on every folder add/remove
// never leaves a stale, unbound button behind.
function bindFolderRow() {
  const row = document.getElementById('assetFolderRow');
  if (!row || row.dataset.bound) return;
  row.dataset.bound = '1';
  row.addEventListener('click', (e) => {
    if (e.target.closest('#folderAddBtn')) {
      if (!bearipRequireLogin('my-dna.html')) return;
      addingFolder = true;
      renderFolderRow();
      return;
    }
    if (e.target.closest('#folderAddConfirm')) {
      confirmAddFolder();
      return;
    }
    if (e.target.closest('#folderAddCancel')) {
      addingFolder = false;
      renderFolderRow();
      return;
    }
    const removeBtn = e.target.closest('.md-folder-remove');
    if (removeBtn) {
      e.stopPropagation();
      const id = removeBtn.dataset.removeFolder;
      const folder = mdGetFolders().find((f) => f.id === id);
      mdDeleteFolder(id);
      if (currentFolderFilter === id) currentFolderFilter = 'all';
      renderFolderRow();
      renderAssets();
      bearipShowToast(`'${folder ? folder.name : '폴더'}' 폴더를 삭제했어요. 자산은 유지돼요.`);
      return;
    }
    const chip = e.target.closest('.md-folder-chip');
    if (chip) {
      currentFolderFilter = chip.dataset.folderId;
      renderFolderRow();
      applyAssetFilters();
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

  const folders = mdGetFolders();
  currentIP.assets.forEach((asset, i) => {
    const card = document.createElement('div');
    card.className = 'md-asset-card';
    card.dataset.type = asset.type || 'other';
    card.dataset.index = i;
    card.dataset.folderId = asset.folderId || '';
    card.tabIndex = 0;
    const hasImage = !!asset.imageData;
    const thumbClass = hasImage ? 'md-asset-thumb has-image' : `md-asset-thumb ${asset.thumb || 'thumb-1'}`;
    const thumbStyle = hasImage ? ` style="background-image:url('${asset.imageData}')"` : '';
    const iconHtml = hasImage ? '' : ASSET_ICONS[asset.icon] || '';
    const meta = asset.blobStored ? `${asset.date} · ${mdFormatFileSize(asset.fileSize)}` : `${asset.ver} · ${asset.date}`;
    const folderOptions =
      `<option value=""${asset.folderId ? '' : ' selected'}>폴더 없음</option>` +
      folders.map((f) => `<option value="${f.id}"${asset.folderId === f.id ? ' selected' : ''}>${bearipEscapeHtml(f.name)}</option>`).join('');
    card.innerHTML = `
      <button type="button" class="md-asset-delete" data-index="${i}" aria-label="자산 삭제">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
      <div class="${thumbClass}"${thumbStyle}>${iconHtml}</div>
      <div class="md-asset-name">${bearipEscapeHtml(asset.name)}</div>
      <div class="md-asset-meta">${meta}</div>
      <select class="md-asset-folder-select" data-index="${i}" aria-label="폴더로 이동">${folderOptions}</select>
    `;
    row.insertBefore(card, addBtn);
  });
  applyAssetFilters();
}

function deleteAssetAt(index) {
  const asset = (currentIP.assets || [])[index];
  currentIP.assets = (currentIP.assets || []).filter((_, i) => i !== index);
  if (currentIP.id !== 'demo') bearipUpdateIP(currentIP.id, { assets: currentIP.assets });
  if (asset && asset.blobStored) bearipDeleteAssetFile(asset.id);
  renderAssets();
}

let mdPreviewObjectUrl = null;

function ensureAssetPreviewOverlay() {
  let overlay = document.getElementById('assetPreviewOverlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'md-asset-preview-overlay';
  overlay.id = 'assetPreviewOverlay';
  // Not the `hidden` attribute — its UA display:none rule has the same
  // specificity as this overlay's own `display:flex` and loses to it, so
  // the overlay would stay visible. Toggle style.display directly instead.
  overlay.style.display = 'none';
  overlay.innerHTML = `
    <div class="md-asset-preview-box">
      <div class="md-asset-preview-head">
        <span id="assetPreviewTitle"></span>
        <button type="button" class="md-asset-preview-close" id="assetPreviewClose" aria-label="닫기">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <div class="md-asset-preview-body" id="assetPreviewBody"></div>
      <div class="md-asset-preview-meta" id="assetPreviewMeta"></div>
    </div>
  `;
  (document.querySelector('.dna-app') || document.body).appendChild(overlay);
  // Delegated on the overlay itself, attached exactly once — same robustness
  // reasoning as the roadmap-edit popup's close handling.
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('#assetPreviewClose')) closeAssetPreview();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display !== 'none') closeAssetPreview();
  });
  return overlay;
}

function closeAssetPreview() {
  const overlay = document.getElementById('assetPreviewOverlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
  if (mdPreviewObjectUrl) {
    URL.revokeObjectURL(mdPreviewObjectUrl);
    mdPreviewObjectUrl = null;
  }
  const body = document.getElementById('assetPreviewBody');
  if (body) body.innerHTML = '';
}

async function openAssetPreview(index) {
  const asset = (currentIP.assets || [])[index];
  if (!asset) return;

  const overlay = ensureAssetPreviewOverlay();
  if (mdPreviewObjectUrl) {
    URL.revokeObjectURL(mdPreviewObjectUrl);
    mdPreviewObjectUrl = null;
  }
  const body = document.getElementById('assetPreviewBody');
  const meta = document.getElementById('assetPreviewMeta');
  document.getElementById('assetPreviewTitle').textContent = asset.name;
  meta.textContent = '';
  body.innerHTML = '<div class="md-asset-preview-loading">불러오는 중...</div>';
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  if (asset.imageData) {
    body.innerHTML = `<img src="${asset.imageData}" alt="${bearipEscapeHtml(asset.name)}">`;
    meta.textContent = `${asset.ver} · ${asset.date}`;
    return;
  }

  if (!asset.blobStored) {
    body.innerHTML = '<div class="md-asset-preview-empty">미리보기를 지원하지 않는 자산이에요</div>';
    return;
  }

  try {
    const record = await bearipGetAssetFile(asset.id);
    if (!record) {
      body.innerHTML = '<div class="md-asset-preview-empty">파일을 찾을 수 없어요</div>';
      return;
    }
    const url = URL.createObjectURL(record.blob);
    mdPreviewObjectUrl = url;
    if (asset.mime && asset.mime.startsWith('video/')) {
      body.innerHTML = `<video src="${url}" controls autoplay></video>`;
    } else if (asset.mime === 'application/pdf') {
      body.innerHTML = `<iframe src="${url}" class="md-asset-preview-pdf"></iframe>`;
    } else {
      body.innerHTML = `
        <div class="md-asset-preview-empty">미리보기를 지원하지 않는 파일 형식이에요</div>
        <a class="md-asset-preview-download" href="${url}" download="${bearipEscapeHtml(record.name)}">다운로드</a>
      `;
    }
    meta.textContent = `${asset.date} · ${mdFormatFileSize(asset.fileSize)}`;
  } catch (e) {
    body.innerHTML = '<div class="md-asset-preview-empty">파일을 불러오지 못했어요</div>';
  }
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
  renderPublishButton();
  renderGoals();
  renderGenreTags();
  renderStatus();
  renderRoadmap();
  renderFolderRow();
  renderAssets();
  renderDiscussion();
  renderProductionRequestsList();
}

function persistGoalChange(goal) {
  currentIP.goal = goal;
  // Each goal has its own production pipeline — rebuild the roadmap's steps
  // for it, keeping progress on any step (matched by key) shared with the
  // previous goal instead of silently discarding it.
  currentIP.roadmap = bearipBuildRoadmap(goal, currentIP.roadmap);
  if (currentIP.id !== 'demo' && typeof bearipUpdateIP === 'function') {
    bearipUpdateIP(currentIP.id, { goal, roadmap: currentIP.roadmap });
  }
  recomputeProductionProgress();
}

document.addEventListener('DOMContentLoaded', () => {
  loadCurrentIP();
  renderAll();

  document.getElementById('mdPublishBtn').addEventListener('click', toggleIPVisibility);

  document.getElementById('mdGenreAddBtn').addEventListener('click', () => {
    const picker = document.getElementById('mdGenrePicker');
    picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
  });

  document.getElementById('currentIpChip').addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = document.getElementById('ipSwitcherMenu');
    if (menu.hidden) openIpSwitcher();
    else closeIpSwitcher();
  });

  document.getElementById('currentIpThumbEditBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('currentIpCoverInput').click();
  });
  document.getElementById('currentIpCoverInput').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    changeCurrentIpCoverImage(file);
  });
  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('ipSwitcher');
    const menu = document.getElementById('ipSwitcherMenu');
    if (wrap && menu && !menu.hidden && !wrap.contains(e.target)) closeIpSwitcher();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeIpSwitcher();
  });

  const dnaCard = document.querySelector('.md-status-card.purple');
  if (dnaCard) dnaCard.addEventListener('click', openWritingCompletenessView);
  const productionCard = document.querySelector('.md-status-card.green');
  if (productionCard) productionCard.addEventListener('click', jumpToRoadmap);

  const requestReviewBtn = document.getElementById('mdRequestReviewBtn');
  if (requestReviewBtn) requestReviewBtn.addEventListener('click', mdRequestExpertReview);

  // One action per step now (미등록/작성 중/전문가 검토 중/보완 필요/준비 완료/
  // 제작 의뢰 중/제작 완료), each routed to whichever existing flow already
  // handles that state — real <button>s, so no separate keydown wiring needed.
  document.getElementById('roadmapContainer').addEventListener('click', (e) => {
    const btn = e.target.closest('.md-road-action-btn');
    if (!btn) return;
    e.stopPropagation();
    const index = parseInt(btn.dataset.index, 10);
    const step = currentIP.roadmap[index];
    if (!step) return;
    switch (btn.dataset.status) {
      case 'unregistered':
      case 'writing':
        openStepMaterialEditor(index);
        break;
      case 'reviewing':
      case 'needs_revision':
        openAdminReviewView(step.key);
        break;
      case 'ready':
        openProductionRequest('roadmap', step.key, step.label.replace(/<br>/g, ' '), BEARIP_ROADMAP_STEP_PRICE[step.key] || 0);
        break;
      case 'production_requested':
      case 'production_done': {
        const tab = document.querySelector('#mdTabs [data-tab-target="production"]');
        if (tab) tab.click();
        break;
      }
    }
  });

  document.getElementById('assetsRow').addEventListener('click', (e) => {
    const delBtn = e.target.closest('.md-asset-delete');
    if (delBtn) {
      e.stopPropagation();
      deleteAssetAt(parseInt(delBtn.dataset.index, 10));
      return;
    }
    // A click into the folder <select> shouldn't also open the preview
    // overlay underneath it.
    if (e.target.closest('.md-asset-folder-select')) return;
    const card = e.target.closest('.md-asset-card');
    if (card) openAssetPreview(parseInt(card.dataset.index, 10));
  });
  document.getElementById('assetsRow').addEventListener('change', (e) => {
    const select = e.target.closest('.md-asset-folder-select');
    if (!select) return;
    const index = parseInt(select.dataset.index, 10);
    mdSetAssetFolder(index, select.value || null);
    const card = select.closest('.md-asset-card');
    if (card) card.dataset.folderId = select.value || '';
    applyAssetFilters();
  });
  document.getElementById('assetsRow').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.closest('.md-asset-folder-select')) return;
    const card = e.target.closest('.md-asset-card');
    if (!card) return;
    e.preventDefault();
    openAssetPreview(parseInt(card.dataset.index, 10));
  });

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
  bindFolderRow();
});

const ASSET_TYPE_ICONS = { character: 'user', world: 'doc', story: 'file', art: 'image' };
const ASSET_THUMB_CYCLE = ['thumb-1', 'thumb-2', 'thumb-3', 'thumb-4', 'thumb-5', 'thumb-6', 'thumb-7', 'thumb-8'];

async function addAssetFromUpload(title, type, file, folderId) {
  if (file && file.size > BEARIP_MAX_ASSET_FILE_BYTES) {
    throw new Error('파일이 너무 커요 (최대 50MB)');
  }
  if (file && !(await bearipCheckStorageRoom(file.size))) {
    throw new Error('저장 공간이 부족해요. 다른 파일을 시도해보세요.');
  }

  const isImage = !!file && file.type.startsWith('image/');
  let imageData = null;
  if (isImage) {
    imageData = await bearipResizeImageToDataUrl(file, 480, 0.85);
  }

  const id = 'asset_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  // Non-image files (docs, video clips, etc.) go to IndexedDB — they have no
  // small inline thumbnail to fall back to, so they need the bigger quota.
  const needsBlobStore = !!file && !isImage;
  if (needsBlobStore) {
    try {
      await bearipSaveAssetFile(id, file);
    } catch (e) {
      throw new Error('저장 공간이 부족해요. 다른 파일을 시도해보세요.');
    }
  }

  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
  const thumb = ASSET_THUMB_CYCLE[(currentIP.assets || []).length % ASSET_THUMB_CYCLE.length];

  const isVideo = !!file && file.type.startsWith('video/');
  const asset = {
    id,
    name: title,
    ver: 'v1.0',
    date: dateStr,
    thumb,
    icon: isVideo ? 'video' : ASSET_TYPE_ICONS[type] || 'file',
    type,
  };
  if (folderId) asset.folderId = folderId;
  if (imageData) asset.imageData = imageData;
  if (file) {
    asset.fileName = file.name;
    asset.fileSize = file.size;
  }
  if (needsBlobStore) {
    asset.blobStored = true;
    asset.mime = file.type;
  }

  currentIP.assets = [...(currentIP.assets || []), asset];
  if (currentIP.id !== 'demo') {
    try {
      bearipUpdateIP(currentIP.id, { assets: currentIP.assets });
    } catch (e) {
      currentIP.assets = currentIP.assets.filter((a) => a !== asset);
      if (needsBlobStore) bearipDeleteAssetFile(id);
      throw new Error('저장 공간이 부족해요. 더 작은 파일로 시도해보세요.');
    }
  }
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
    const folders = mdGetFolders();
    // Only bother showing the folder picker once the user's actually made
    // one — otherwise it'd be a select with a single, pointless option.
    const folderSelectHtml = folders.length
      ? `<select id="assetFolderSelect">
           <option value="">폴더 없음</option>
           ${folders.map((f) => `<option value="${f.id}"${currentFolderFilter === f.id ? ' selected' : ''}>${bearipEscapeHtml(f.name)}</option>`).join('')}
         </select>`
      : '';
    tile.innerHTML = `
      <div class="md-asset-add-form">
        <input type="text" id="assetTitleInput" placeholder="자산 이름" maxlength="30">
        <label class="md-asset-file-label" for="assetFileInput" id="assetFileLabel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4.5 4.5 0 01-1-8.9 5.5 5.5 0 0110.6-1.8A4.5 4.5 0 0117 18z"/><path d="M12 11v7M9.5 15.5L12 13l2.5 2.5"/></svg>
          <span class="fname">이미지·영상·문서 선택 (최대 50MB)</span>
        </label>
        <input type="file" id="assetFileInput" accept="image/*,video/*,.pdf,.doc,.docx,.txt" style="display:none">
        <select id="assetTypeSelect">
          <option value="character">캐릭터</option>
          <option value="world">세계관</option>
          <option value="story">스토리</option>
          <option value="art">아트워크</option>
        </select>
        ${folderSelectHtml}
        <div class="row">
          <button type="button" class="confirm" id="assetConfirmBtn">추가</button>
          <button type="button" class="cancel" id="assetCancelBtn">취소</button>
        </div>
      </div>
    `;
    const input = document.getElementById('assetTitleInput');
    const fileInput = document.getElementById('assetFileInput');
    const fileLabel = document.getElementById('assetFileLabel');
    input.focus();
    input.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitAsset();
      if (e.key === 'Escape') reset();
    });
    fileInput.addEventListener('click', (e) => e.stopPropagation());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      fileLabel.classList.add('has-file');
      fileLabel.querySelector('.fname').textContent = file.name;
      if (!input.value.trim()) input.value = file.name.replace(/\.[^.]+$/, '');
      const typeSelect = document.getElementById('assetTypeSelect');
      if (file.type.startsWith('image/')) typeSelect.value = 'art';
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

  async function submitAsset() {
    const input = document.getElementById('assetTitleInput');
    const fileInput = document.getElementById('assetFileInput');
    const typeSelect = document.getElementById('assetTypeSelect');
    const folderSelect = document.getElementById('assetFolderSelect');
    const file = fileInput.files[0] || null;
    const title = input.value.trim() || (file ? file.name.replace(/\.[^.]+$/, '') : '');
    if (!title) {
      input.focus();
      return;
    }
    const confirmBtn = document.getElementById('assetConfirmBtn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = '추가 중...';
    try {
      await addAssetFromUpload(title, typeSelect.value, file, folderSelect ? folderSelect.value : null);
      reset();
    } catch (err) {
      bearipShowToast(err.message || '자산 추가에 실패했어요');
      confirmBtn.disabled = false;
      confirmBtn.textContent = '추가';
    }
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
