// This page doesn't load auth-ui.js (no profile-chip header to wire up),
// so it doesn't get the shared bearipEscapeHtml from there — small local copy.
function niEscapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

const TOTAL_STEPS = 5;
let currentStep = 1;
let selectedGoal = 'webnovel';
let selectedGenres = [];
let selectedVis = 'public';
let coverFile = null;
let coverImageData = null;
// keyed by roadmap step key: { hasContent, imageData, fileName, fileSize, mime, note }
let roadmapSubmissions = {};

const panels = document.querySelectorAll('.ni-panel');
const steps = document.querySelectorAll('.ni-step');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const stepCount = document.getElementById('stepCount');

function renderStep() {
  panels.forEach((p) => p.classList.toggle('active', Number(p.dataset.panel) === currentStep));
  steps.forEach((s) => {
    const n = Number(s.dataset.step);
    s.classList.toggle('active', n === currentStep);
    s.classList.toggle('done', n < currentStep);
  });
  stepCount.textContent = `${currentStep} / ${TOTAL_STEPS}`;
  prevBtn.disabled = currentStep === 1;

  if (currentStep === 4) {
    renderRoadmapItemsStep();
  }

  if (currentStep === TOTAL_STEPS) {
    nextBtn.innerHTML = `IP 만들기 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z"/></svg>`;
    populateSummary();
  } else {
    nextBtn.innerHTML = `다음 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>`;
  }
}

function populateSummary() {
  const title = document.getElementById('ipTitle').value.trim() || '제목 없음';
  const logline = document.getElementById('ipLogline').value.trim() || '로그라인 없음';
  const goalBtn = document.querySelector(`.ni-goal[data-goal="${selectedGoal}"]`);
  const goalLabel = goalBtn ? goalBtn.dataset.label : '-';
  const visLabel = selectedVis === 'public' ? '전체 공개 (참여형)' : '비공개 (나만 보기)';

  document.getElementById('sumTitle').textContent = title;
  document.getElementById('sumGoal').textContent = `목표: ${goalLabel}`;
  document.getElementById('sumLogline').textContent = logline;
  document.getElementById('sumVis').textContent = `공개 범위: ${visLabel}`;

  const sumCover = document.querySelector('.ni-summary-cover');
  sumCover.style.backgroundImage = coverImageData ? `url('${coverImageData}')` : '';

  const chipsWrap = document.getElementById('sumGenres');
  chipsWrap.innerHTML = '';
  if (selectedGenres.length === 0) {
    const span = document.createElement('span');
    span.textContent = '장르 미선택';
    chipsWrap.appendChild(span);
  } else {
    selectedGenres.forEach((g) => {
      const span = document.createElement('span');
      span.textContent = g;
      chipsWrap.appendChild(span);
    });
  }

  const hasAnySubmission = Object.values(roadmapSubmissions).some((s) => s && s.hasContent);
  document.getElementById('sumReviewNotice').hidden = !hasAnySubmission;
}

// Step 1: goal selection
document.querySelectorAll('.ni-goal').forEach((goal) => {
  goal.addEventListener('click', () => {
    document.querySelectorAll('.ni-goal').forEach((g) => g.classList.remove('active'));
    goal.classList.add('active');
    selectedGoal = goal.dataset.goal;
  });
});

// Step 2: genre chips (max 3) — delegated so custom chips added later work
// exactly the same as the preset ones without needing their own listener.
const genreChipsWrap = document.getElementById('genreChips');
genreChipsWrap.addEventListener('click', (e) => {
  const chip = e.target.closest('.ni-chip');
  if (!chip) return;
  const genre = chip.dataset.genre;
  if (chip.classList.contains('active')) {
    selectedGenres = selectedGenres.filter((g) => g !== genre);
    // Custom chips only exist because the user typed them in — once
    // deselected there's no preset row to fall back to, so remove it.
    if (chip.classList.contains('custom')) chip.remove();
    else chip.classList.remove('active');
  } else {
    if (selectedGenres.length >= 3) return;
    chip.classList.add('active');
    selectedGenres.push(genre);
  }
});

// Step 2: custom genre text entry
const genreCustomInput = document.getElementById('genreCustomInput');
const genreCustomAddBtn = document.getElementById('genreCustomAddBtn');

function addCustomGenre() {
  const value = genreCustomInput.value.trim();
  if (!value) return;
  if (selectedGenres.length >= 3) {
    genreCustomInput.value = '';
    return;
  }
  if (selectedGenres.includes(value)) {
    genreCustomInput.value = '';
    return;
  }
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'ni-chip active custom';
  chip.dataset.genre = value;
  chip.textContent = value;
  genreChipsWrap.appendChild(chip);
  selectedGenres.push(value);
  genreCustomInput.value = '';
}

genreCustomAddBtn.addEventListener('click', addCustomGenre);
genreCustomInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addCustomGenre();
  }
});

// Step 2: visibility toggle
document.querySelectorAll('.ni-vis-option').forEach((opt) => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.ni-vis-option').forEach((o) => o.classList.remove('active'));
    opt.classList.add('active');
    selectedVis = opt.dataset.vis;
  });
});

// Step 3: cover upload
const coverUpload = document.getElementById('coverUpload');
const coverInput = document.getElementById('coverInput');
const coverText = document.getElementById('coverText');
const coverHint = document.getElementById('coverHint');
const coverRemoveBtn = document.getElementById('coverRemoveBtn');
const COVER_DEFAULT_HINT = coverHint.textContent;

function setCoverError(message) {
  coverUpload.classList.add('error');
  coverText.textContent = '업로드에 실패했어요';
  coverHint.textContent = message;
}

function clearCover() {
  coverFile = null;
  coverImageData = null;
  coverInput.value = '';
  coverUpload.classList.remove('has-file', 'error');
  coverUpload.style.backgroundImage = '';
  coverText.textContent = '클릭해서 커버 이미지 업로드';
  coverHint.textContent = COVER_DEFAULT_HINT;
  coverRemoveBtn.hidden = true;
}

coverUpload.addEventListener('click', (e) => {
  if (e.target.closest('.ni-upload-remove')) return;
  coverInput.click();
});

coverRemoveBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  clearCover();
});

coverInput.addEventListener('change', async () => {
  const file = coverInput.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    setCoverError('이미지 파일만 업로드할 수 있어요');
    return;
  }
  if (file.size > BEARIP_MAX_ASSET_FILE_BYTES) {
    setCoverError('파일이 너무 커요 (최대 50MB)');
    return;
  }
  if (!(await bearipCheckStorageRoom(file.size))) {
    setCoverError('저장 공간이 부족해요. 다른 파일을 시도해보세요.');
    return;
  }

  coverUpload.classList.remove('error');
  coverText.textContent = '이미지를 불러오는 중...';
  try {
    coverImageData = await bearipResizeImageToDataUrl(file, 800, 0.85);
    coverFile = file;
    coverUpload.classList.add('has-file');
    coverUpload.style.backgroundImage = `url('${coverImageData}')`;
    coverText.textContent = file.name;
    coverHint.textContent = '다른 이미지를 선택하려면 클릭하세요';
    coverRemoveBtn.hidden = false;
  } catch (err) {
    setCoverError(err.message || '이미지를 불러오지 못했어요');
  }
});

// Step 4: 로드맵 항목 1차 등록 — rebuilt from the *selected goal's* roadmap
// (bearipBuildRoadmap already knows each goal's own item set), so this
// naturally adapts to webnovel/webtoon/video/multi without hardcoding a
// video-specific list here.
function roadItemBlockHtml(step) {
  const sub = roadmapSubmissions[step.key] || { hasContent: false };
  const hasFile = !!(sub.imageData || sub.fileName);
  const uploadClass = hasFile ? 'ni-road-upload has-file' : 'ni-road-upload';
  const uploadStyle = sub.imageData ? ` style="background-image:url('${sub.imageData}')"` : '';
  const uploadText = hasFile ? sub.fileName || '파일 첨부됨' : '클릭해서 파일 업로드';
  const uploadHint = hasFile ? '다른 파일을 선택하려면 클릭하세요' : '이미지, 영상, 문서 — 최대 50MB';
  const label = step.label.replace(/<br>/g, ' ');
  return `
    <div class="ni-road-item" data-key="${step.key}">
      <div class="ni-road-item-head">
        <span class="ni-road-item-label">${niEscapeHtml(label)}</span>
        <div class="ni-road-item-toggle">
          <button type="button" class="ni-road-toggle-btn${sub.hasContent ? '' : ' active'}" data-choice="none">아직 없어요</button>
          <button type="button" class="ni-road-toggle-btn${sub.hasContent ? ' active' : ''}" data-choice="has">자료 등록</button>
        </div>
      </div>
      <div class="ni-road-item-body"${sub.hasContent ? '' : ' hidden'}>
        <div class="${uploadClass}"${uploadStyle}>
          <input type="file" accept="image/*,video/*,.pdf,.doc,.docx,.txt" style="display:none">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 15l5-5 4 4 4-4 5 5"/><circle cx="8" cy="9" r="1.4"/></svg>
          <div class="t">${niEscapeHtml(uploadText)}</div>
          <div class="d">${niEscapeHtml(uploadHint)}</div>
        </div>
        <textarea class="ni-road-item-note" placeholder="간단한 설명이나 메모 (선택)" maxlength="200">${niEscapeHtml(sub.note || '')}</textarea>
      </div>
    </div>
  `;
}

function renderRoadmapItemsStep() {
  const list = document.getElementById('roadItemsList');
  const goalSteps = bearipBuildRoadmap(selectedGoal, null);
  list.innerHTML = goalSteps.map(roadItemBlockHtml).join('');
}

const roadItemsList = document.getElementById('roadItemsList');

roadItemsList.addEventListener('click', (e) => {
  const toggleBtn = e.target.closest('.ni-road-toggle-btn');
  if (toggleBtn) {
    const itemEl = toggleBtn.closest('.ni-road-item');
    const key = itemEl.dataset.key;
    const hasContent = toggleBtn.dataset.choice === 'has';
    roadmapSubmissions[key] = Object.assign({ hasContent: false }, roadmapSubmissions[key], { hasContent });
    itemEl.querySelectorAll('.ni-road-toggle-btn').forEach((b) => b.classList.toggle('active', b === toggleBtn));
    itemEl.querySelector('.ni-road-item-body').hidden = !hasContent;
    return;
  }
  const upload = e.target.closest('.ni-road-upload');
  if (upload) upload.querySelector('input[type="file"]').click();
});

roadItemsList.addEventListener('change', async (e) => {
  const input = e.target.closest('input[type="file"]');
  if (!input) return;
  const file = input.files[0];
  if (!file) return;
  const itemEl = input.closest('.ni-road-item');
  const key = itemEl.dataset.key;
  const uploadEl = input.closest('.ni-road-upload');

  if (file.size > BEARIP_MAX_ASSET_FILE_BYTES) {
    uploadEl.classList.add('error');
    uploadEl.querySelector('.d').textContent = '파일이 너무 커요 (최대 50MB)';
    return;
  }
  if (!(await bearipCheckStorageRoom(file.size))) {
    uploadEl.classList.add('error');
    uploadEl.querySelector('.d').textContent = '저장 공간이 부족해요. 다른 파일을 시도해보세요.';
    return;
  }

  const sub = Object.assign({ hasContent: true }, roadmapSubmissions[key], {
    hasContent: true,
    fileName: file.name,
    fileSize: file.size,
    mime: file.type,
    imageData: null,
  });
  if (file.type.startsWith('image/')) {
    try {
      sub.imageData = await bearipResizeImageToDataUrl(file, 720, 0.85);
    } catch (err) {
      uploadEl.classList.add('error');
      uploadEl.querySelector('.d').textContent = err.message || '이미지를 불러오지 못했어요';
      return;
    }
  }
  roadmapSubmissions[key] = sub;

  uploadEl.classList.remove('error');
  uploadEl.classList.add('has-file');
  uploadEl.style.backgroundImage = sub.imageData ? `url('${sub.imageData}')` : '';
  uploadEl.querySelector('.t').textContent = file.name;
  uploadEl.querySelector('.d').textContent = '다른 파일을 선택하려면 클릭하세요';
});

roadItemsList.addEventListener('input', (e) => {
  const note = e.target.closest('.ni-road-item-note');
  if (!note) return;
  const key = note.closest('.ni-road-item').dataset.key;
  roadmapSubmissions[key] = Object.assign({ hasContent: true }, roadmapSubmissions[key], { note: note.value });
});

// Footer nav
prevBtn.addEventListener('click', () => {
  if (currentStep > 1) {
    currentStep -= 1;
    renderStep();
  }
});

function createAndSaveIP() {
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

  const assets = [];
  if (coverImageData) {
    assets.push({
      id: 'asset_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      name: '커버 이미지',
      ver: 'v1.0',
      date: dateStr,
      thumb: 'thumb-1',
      icon: 'image',
      type: 'art',
      imageData: coverImageData,
      fileName: coverFile ? coverFile.name : undefined,
      fileSize: coverFile ? coverFile.size : undefined,
    });
  }

  const ipId = 'ip_' + Date.now();
  const roadmap = bearipBuildRoadmap(selectedGoal, null);
  const reviewRequestedAt = new Date().toISOString();

  // Each step carries the creator's 1차 등록 (or "아직 없어요") alongside
  // where the page-admin's own score + one-line comment will land once
  // reviewed — kept per step (not one IP-wide number) since a video IP's
  // 시나리오 can be done while 편집/사운드 hasn't even started.
  const reviewRequests = [];
  roadmap.forEach((step) => {
    const sub = roadmapSubmissions[step.key];
    const hasContent = !!(sub && sub.hasContent);
    step.submission = hasContent
      ? { imageData: sub.imageData || null, fileName: sub.fileName || null, fileSize: sub.fileSize || null, mime: sub.mime || null, note: sub.note || '' }
      : null;
    step.reviewStatus = hasContent ? 'pending' : null;
    step.adminProgress = null;
    step.adminComment = null;
    step.adminReviewedAt = null;

    if (hasContent) {
      reviewRequests.push({
        id: 'ipreview_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        ipId,
        ipTitle: document.getElementById('ipTitle').value.trim() || '제목 없는 IP',
        stepKey: step.key,
        stepLabel: step.label.replace(/<br>/g, ' '),
        submission: step.submission,
        requestedAt: reviewRequestedAt,
        status: 'pending',
        adminProgress: null,
        adminComment: null,
        reviewedAt: null,
      });
    }
  });

  const ip = {
    id: ipId,
    title: document.getElementById('ipTitle').value.trim() || '제목 없는 IP',
    goal: selectedGoal,
    genres: selectedGenres.slice(),
    logline: document.getElementById('ipLogline').value.trim(),
    synopsis: document.getElementById('ipSynopsis').value.trim(),
    coverImage: coverImageData || undefined,
    visibility: selectedVis,
    createdAt: new Date().toISOString(),
    // A brand-new IP always starts at 0% — nothing has been produced yet.
    dnaScore: 0,
    dnaBreakdown: { concept: 0, world: 0, character: 0, story: 0, visual: 0, assets: 0 },
    readinessScore: 0,
    productionProgress: 0,
    roadmap,
    reviewRequestedAt: reviewRequests.length ? reviewRequestedAt : null,
    assets,
    discussion: [],
    views: 0,
    likes: 0,
  };
  bearipAddIP(ip);
  reviewRequests.forEach((r) => bearipAddIpReview(r));

  bearipAddNotification({
    type: 'ip',
    title: '새 IP가 생성됐어요',
    message: reviewRequests.length
      ? `'${ip.title}'가 MY DNA에 추가됐어요. 등록한 ${reviewRequests.length}개 항목이 관리자 심사에 들어갔어요.`
      : `'${ip.title}'가 MY DNA에 추가됐어요. 목표부터 채워보세요.`,
    link: 'my-dna.html',
  });
  return ip;
}

nextBtn.addEventListener('click', () => {
  if (currentStep < TOTAL_STEPS) {
    currentStep += 1;
    renderStep();
  } else {
    createAndSaveIP();
    location.href = 'my-dna.html';
  }
});

renderStep();
