const TOTAL_STEPS = 4;
let currentStep = 1;
let selectedGoal = 'webnovel';
let selectedGenres = [];
let selectedVis = 'public';
let coverFile = null;
let coverImageData = null;

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
}

// Step 1: goal selection
document.querySelectorAll('.ni-goal').forEach((goal) => {
  goal.addEventListener('click', () => {
    document.querySelectorAll('.ni-goal').forEach((g) => g.classList.remove('active'));
    goal.classList.add('active');
    selectedGoal = goal.dataset.goal;
  });
});

// Step 2: genre chips (max 3)
document.querySelectorAll('.ni-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    const genre = chip.dataset.genre;
    if (chip.classList.contains('active')) {
      chip.classList.remove('active');
      selectedGenres = selectedGenres.filter((g) => g !== genre);
    } else {
      if (selectedGenres.length >= 3) return;
      chip.classList.add('active');
      selectedGenres.push(genre);
    }
  });
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

// Footer nav
prevBtn.addEventListener('click', () => {
  if (currentStep > 1) {
    currentStep -= 1;
    renderStep();
  }
});

function createAndSaveIP() {
  const assets = [];
  if (coverImageData) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
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

  const ip = {
    id: 'ip_' + Date.now(),
    title: document.getElementById('ipTitle').value.trim() || '제목 없는 IP',
    goal: selectedGoal,
    genres: selectedGenres.slice(),
    logline: document.getElementById('ipLogline').value.trim(),
    synopsis: document.getElementById('ipSynopsis').value.trim(),
    visibility: selectedVis,
    createdAt: new Date().toISOString(),
    // A brand-new IP always starts at 0% — nothing has been produced yet.
    dnaScore: 0,
    dnaBreakdown: { concept: 0, world: 0, character: 0, story: 0, visual: 0, assets: 0 },
    readinessScore: 0,
    productionProgress: 0,
    roadmap: bearipBuildRoadmap(selectedGoal, null),
    assets,
    discussion: [],
    views: 0,
    likes: 0,
  };
  bearipAddIP(ip);
  bearipAddNotification({
    type: 'ip',
    title: '새 IP가 생성됐어요',
    message: `'${ip.title}'가 MY DNA에 추가됐어요. 목표부터 채워보세요.`,
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
