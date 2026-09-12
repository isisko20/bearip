// This page doesn't load auth-ui.js (no profile-chip header to wire up),
// so it doesn't get the shared bearipEscapeHtml from there — small local copy.
function niEscapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

const TOTAL_STEPS = 4;
let currentStep = 1;
let selectedGoal = 'webnovel';
let selectedGenres = [];
let selectedVis = 'public';
let coverFile = null;
let coverImageData = null;
// keyed by roadmap step key -> array of entries, each a separate registered
// item under that step (e.g. 시나리오의 1화/2화를 따로): { id, label, note,
// imageData, fileName, fileSize, mime }
let roadmapItems = {};

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

  if (currentStep === 3) {
    renderRoadmapItemsStep();
  }

  // Last step swaps the single nextBtn for two explicit choices — creating
  // the IP no longer also fires the 전문가 검토 요청 automatically, so the
  // creator picks whether to send it right away or review in MY DNA first.
  const isFinalStep = currentStep === TOTAL_STEPS;
  nextBtn.hidden = isFinalStep;
  document.getElementById('niFooterFinal').hidden = !isFinalStep;
  if (isFinalStep) {
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

  const hasAnySubmission = Object.values(roadmapItems).some((entries) => (entries || []).length > 0);
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

// Step 2: cover upload
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

// Step 3: 로드맵 항목 1차 등록 — rebuilt from the *selected goal's* roadmap
// (bearipBuildRoadmap already knows each goal's own item set), so this
// naturally adapts to webnovel/webtoon/video/multi without hardcoding a
// video-specific list here. Each item can hold several entries (e.g. 시나리오
// 1화, 2화 등록해서 따로 자료를 붙일 수 있음), not just one.
function niMakeEntryId() {
  return 'entry_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function roadEntryHtml(entry) {
  const hasFile = !!(entry.imageData || entry.fileName);
  const uploadClass = hasFile ? 'ni-road-upload has-file' : 'ni-road-upload';
  const uploadStyle = entry.imageData ? ` style="background-image:url('${entry.imageData}')"` : '';
  const uploadText = hasFile ? entry.fileName || '파일 첨부됨' : '클릭해서 파일 업로드';
  const uploadHint = hasFile ? '다른 파일을 선택하려면 클릭하세요' : '이미지, 영상, 문서 — 최대 50MB';
  return `
    <div class="ni-road-entry" data-entry-id="${entry.id}">
      <div class="ni-road-entry-head">
        <input type="text" class="ni-road-entry-label" placeholder="예: 1화, 설정 자료" maxlength="30" value="${niEscapeHtml(entry.label || '')}">
        <button type="button" class="ni-road-entry-remove" aria-label="이 자료 삭제">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <div class="${uploadClass}"${uploadStyle}>
        <input type="file" accept="image/*,video/*,.pdf,.doc,.docx,.txt" style="display:none">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 15l5-5 4 4 4-4 5 5"/><circle cx="8" cy="9" r="1.4"/></svg>
        <div class="t">${niEscapeHtml(uploadText)}</div>
        <div class="d">${niEscapeHtml(uploadHint)}</div>
      </div>
      <textarea class="ni-road-item-note" placeholder="간단한 설명이나 메모 (선택)" maxlength="200">${niEscapeHtml(entry.note || '')}</textarea>
    </div>
  `;
}

function roadItemBlockHtml(step) {
  const entries = roadmapItems[step.key] || [];
  const label = step.label.replace(/<br>/g, ' ');
  const entriesHtml = entries.length
    ? entries.map(roadEntryHtml).join('')
    : '<div class="ni-road-item-empty">아직 등록된 자료가 없어요.</div>';
  return `
    <div class="ni-road-item" data-key="${step.key}">
      <div class="ni-road-item-head">
        <span class="ni-road-item-label">${niEscapeHtml(label)}</span>
      </div>
      <div class="ni-road-item-entries">${entriesHtml}</div>
      <button type="button" class="ni-road-add-entry-btn" data-key="${step.key}">+ 자료 추가</button>
    </div>
  `;
}

function renderRoadmapItemsStep() {
  const list = document.getElementById('roadItemsList');
  const goalSteps = bearipBuildRoadmap(selectedGoal, null);
  list.innerHTML = goalSteps.map(roadItemBlockHtml).join('');
}

function findEntry(key, entryId) {
  return (roadmapItems[key] || []).find((e) => e.id === entryId);
}

const roadItemsList = document.getElementById('roadItemsList');

roadItemsList.addEventListener('click', (e) => {
  const addBtn = e.target.closest('.ni-road-add-entry-btn');
  if (addBtn) {
    const key = addBtn.dataset.key;
    if (!roadmapItems[key]) roadmapItems[key] = [];
    roadmapItems[key].push({ id: niMakeEntryId(), label: '', note: '', imageData: null, fileName: null, fileSize: null, mime: null });
    renderRoadmapItemsStep();
    return;
  }
  const removeBtn = e.target.closest('.ni-road-entry-remove');
  if (removeBtn) {
    const entryEl = removeBtn.closest('.ni-road-entry');
    const itemEl = removeBtn.closest('.ni-road-item');
    const key = itemEl.dataset.key;
    roadmapItems[key] = (roadmapItems[key] || []).filter((en) => en.id !== entryEl.dataset.entryId);
    renderRoadmapItemsStep();
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
  const entryEl = input.closest('.ni-road-entry');
  const itemEl = input.closest('.ni-road-item');
  const key = itemEl.dataset.key;
  const entry = findEntry(key, entryEl.dataset.entryId);
  const uploadEl = input.closest('.ni-road-upload');
  if (!entry) return;

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

  entry.fileName = file.name;
  entry.fileSize = file.size;
  entry.mime = file.type;
  entry.imageData = null;
  if (file.type.startsWith('image/')) {
    try {
      entry.imageData = await bearipResizeImageToDataUrl(file, 720, 0.85);
    } catch (err) {
      uploadEl.classList.add('error');
      uploadEl.querySelector('.d').textContent = err.message || '이미지를 불러오지 못했어요';
      return;
    }
  }

  uploadEl.classList.remove('error');
  uploadEl.classList.add('has-file');
  uploadEl.style.backgroundImage = entry.imageData ? `url('${entry.imageData}')` : '';
  uploadEl.querySelector('.t').textContent = file.name;
  uploadEl.querySelector('.d').textContent = '다른 파일을 선택하려면 클릭하세요';
});

roadItemsList.addEventListener('input', (e) => {
  const entryEl = e.target.closest('.ni-road-entry');
  if (!entryEl) return;
  const itemEl = entryEl.closest('.ni-road-item');
  const entry = findEntry(itemEl.dataset.key, entryEl.dataset.entryId);
  if (!entry) return;
  if (e.target.classList.contains('ni-road-entry-label')) entry.label = e.target.value;
  if (e.target.classList.contains('ni-road-item-note')) entry.note = e.target.value;
});

// Footer nav
prevBtn.addEventListener('click', () => {
  if (currentStep > 1) {
    currentStep -= 1;
    renderStep();
  }
});

// Creating the IP and sending it for 전문가 검토 used to be the same click —
// now deliberately split, so a half-finished 1차 등록 can't get submitted by
// accident. createIP() always just saves; requestExpertReviewForIp() is a
// separate, optional second step (same shape MY DNA's own "전문가 검토 요청"
// button uses later — see mdRequestExpertReview in my-dna-render.js).
function createIP() {
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

  const roadmap = bearipBuildRoadmap(selectedGoal, null);
  roadmap.forEach((step) => {
    const entries = (roadmapItems[step.key] || []).filter((en) => en.imageData || en.fileName || (en.note && en.note.trim()));
    step.submissions = entries.map((en) => ({
      id: en.id,
      label: en.label ? en.label.trim() : '',
      imageData: en.imageData || null,
      fileName: en.fileName || null,
      fileSize: en.fileSize || null,
      mime: en.mime || null,
      note: en.note ? en.note.trim() : '',
    }));
    // null (not requested yet) rather than any "pending" value — a step
    // with material sits in 작성 중 until 전문가 검토 요청 is actually sent.
    step.reviewStatus = null;
    step.adminProgress = null;
    step.adminComment = null;
    step.needsRevision = false;
    step.adminReviewedAt = null;
  });

  const filledCount = roadmap.filter((s) => s.submissions.length > 0).length;

  const ip = {
    id: 'ip_' + Date.now(),
    title: document.getElementById('ipTitle').value.trim() || '제목 없는 IP',
    goal: selectedGoal,
    genres: selectedGenres.slice(),
    logline: document.getElementById('ipLogline').value.trim(),
    synopsis: '',
    coverImage: coverImageData || undefined,
    visibility: selectedVis,
    createdAt: new Date().toISOString(),
    // 작성 완성도 is derived from roadmap submissions from the start (see
    // recomputeWritingCompleteness in my-dna-render.js), not self-input.
    dnaScore: roadmap.length ? Math.round((filledCount / roadmap.length) * 100) : 0,
    dnaBreakdown: { concept: 0, world: 0, character: 0, story: 0, visual: 0, assets: 0 },
    readinessScore: 0,
    productionProgress: null,
    roadmap,
    assets,
    discussion: [],
    views: 0,
    likes: 0,
  };
  bearipAddIP(ip);

  bearipAddNotification({
    type: 'ip',
    title: '새 IP가 생성됐어요',
    message: `'${ip.title}'가 MY DNA에 추가됐어요.`,
    link: 'my-dna.html',
  });
  clearDraft();
  return ip;
}

function requestExpertReviewForIp(ip) {
  const steps = ip.roadmap.filter((s) => s.submissions && s.submissions.length && !s.reviewStatus);
  if (!steps.length) return;
  const requestedAt = new Date().toISOString();
  steps.forEach((step) => {
    step.reviewStatus = 'requested';
    bearipAddIpReview({
      id: 'ipreview_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      ipId: ip.id,
      ipTitle: ip.title,
      stepKey: step.key,
      stepLabel: step.label.replace(/<br>/g, ' '),
      submissions: step.submissions,
      requestedAt,
      status: 'pending',
      adminProgress: null,
      adminComment: null,
      needsRevision: false,
      reviewedAt: null,
    });
  });
  bearipUpdateIP(ip.id, { roadmap: ip.roadmap });
  bearipAddNotification({
    type: 'ip',
    title: '전문가 검토를 요청했어요',
    message: `'${ip.title}'의 ${steps.length}개 항목을 담당 IP 매니저에게 전달했어요.`,
    link: 'my-dna.html',
  });
}

nextBtn.addEventListener('click', () => {
  if (currentStep < TOTAL_STEPS) {
    currentStep += 1;
    renderStep();
  }
});

document.getElementById('finishGoToDnaBtn').addEventListener('click', () => {
  createIP();
  location.href = 'my-dna.html';
});

document.getElementById('finishRequestReviewBtn').addEventListener('click', () => {
  const ip = createIP();
  requestExpertReviewForIp(ip);
  location.href = 'my-dna.html';
});

// ---- 임시저장 — this wizard has no autosave, so leaving mid-way (accidental
// tab close, browser crash) used to lose everything. Saves just the wizard's
// own in-progress state (not yet a real IP) to a single-slot localStorage
// draft; creating the IP for real clears it.
const DRAFT_KEY = 'bearip_new_ip_draft';

function flashDraftBtn(text) {
  const btn = document.getElementById('draftSaveBtn');
  if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent;
  btn.textContent = text;
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = btn.dataset.originalText;
    btn.disabled = false;
  }, 1400);
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (e) {
    /* ignore */
  }
}

function saveDraft() {
  const draft = {
    currentStep,
    selectedGoal,
    selectedGenres: selectedGenres.slice(),
    selectedVis,
    title: document.getElementById('ipTitle').value,
    logline: document.getElementById('ipLogline').value,
    coverImageData,
    coverFileName: coverFile ? coverFile.name : null,
    roadmapItems,
  };
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    flashDraftBtn('저장됨 ✓');
  } catch (err) {
    flashDraftBtn('저장 실패');
  }
}

function applyDraft(draft) {
  selectedGoal = draft.selectedGoal || 'webnovel';
  document.querySelectorAll('.ni-goal').forEach((g) => g.classList.toggle('active', g.dataset.goal === selectedGoal));

  document.querySelectorAll('.ni-chip.custom').forEach((c) => c.remove());
  document.querySelectorAll('.ni-chip').forEach((c) => c.classList.remove('active'));
  selectedGenres = [];
  (draft.selectedGenres || []).forEach((g) => {
    if (selectedGenres.length >= 3) return;
    const existing = Array.from(document.querySelectorAll('.ni-chip')).find((c) => c.dataset.genre === g);
    if (existing) {
      existing.classList.add('active');
    } else {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'ni-chip active custom';
      chip.dataset.genre = g;
      chip.textContent = g;
      genreChipsWrap.appendChild(chip);
    }
    selectedGenres.push(g);
  });

  document.getElementById('ipTitle').value = draft.title || '';
  document.getElementById('ipLogline').value = draft.logline || '';

  selectedVis = draft.selectedVis === 'private' ? 'private' : 'public';
  document.querySelectorAll('.ni-vis-option').forEach((o) => o.classList.toggle('active', o.dataset.vis === selectedVis));

  coverImageData = draft.coverImageData || null;
  coverFile = coverImageData && draft.coverFileName ? { name: draft.coverFileName, size: undefined } : null;
  if (coverImageData) {
    coverUpload.classList.add('has-file');
    coverUpload.classList.remove('error');
    coverUpload.style.backgroundImage = `url('${coverImageData}')`;
    coverText.textContent = draft.coverFileName || '커버 이미지';
    coverHint.textContent = '다른 이미지를 선택하려면 클릭하세요';
    coverRemoveBtn.hidden = false;
  } else {
    clearCover();
  }

  roadmapItems = draft.roadmapItems || {};

  currentStep = draft.currentStep >= 1 && draft.currentStep <= TOTAL_STEPS ? draft.currentStep : 1;
  renderStep();
}

function checkForDraft() {
  let raw;
  try {
    raw = localStorage.getItem(DRAFT_KEY);
  } catch (e) {
    raw = null;
  }
  if (raw) document.getElementById('draftBanner').hidden = false;
}

document.getElementById('draftSaveBtn').addEventListener('click', saveDraft);

document.getElementById('draftResumeBtn').addEventListener('click', () => {
  document.getElementById('draftBanner').hidden = true;
  let raw;
  try {
    raw = localStorage.getItem(DRAFT_KEY);
  } catch (e) {
    raw = null;
  }
  if (!raw) return;
  try {
    applyDraft(JSON.parse(raw));
  } catch (e) {
    /* corrupted draft — ignore and start fresh */
  }
});

document.getElementById('draftDiscardBtn').addEventListener('click', () => {
  clearDraft();
  document.getElementById('draftBanner').hidden = true;
});

checkForDraft();
renderStep();
