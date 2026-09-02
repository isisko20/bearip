const TOTAL_STEPS = 4;
let currentStep = 1;
let selectedGoal = 'webnovel';
let selectedGenres = [];
let selectedVis = 'public';

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

// Step 3: cover upload (visual only, no real file handling)
const coverUpload = document.getElementById('coverUpload');
const coverText = document.getElementById('coverText');
coverUpload.addEventListener('click', () => {
  coverUpload.classList.add('has-file');
  coverText.textContent = '커버 이미지가 선택되었습니다';
});

// Footer nav
prevBtn.addEventListener('click', () => {
  if (currentStep > 1) {
    currentStep -= 1;
    renderStep();
  }
});

function createAndSaveIP() {
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
    assets: [],
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
