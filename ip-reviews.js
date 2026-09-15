// "IP 전문가 검토 관리" — lets whoever's reviewing see every roadmap-step
// submission a creator sent via 전문가 검토 요청 (from new-ip.html's 1차 등록,
// or later from MY DNA) and set a 0-100 전문가 준비도 + 보완 필요 여부 +
// one-line 코멘트 per step. Separate from 제작요청 관리 (production-requests.js):
// that's about outsourcing a step to a Creator; this is the manager scoring
// how complete/real the creator's own submitted material already is.
// Requests/results live in Firebase (see storage.js) so GM can work through
// them from any device — the requester's own MY DNA pulls the result back
// onto that IP's roadmap[i] itself (see mdReconcileRemoteStatus in
// my-dna-render.js) rather than this page reaching into local storage it no
// longer has access to.
//
// Gated to a single mock "관리자" account (temporary nickname: GM — there's
// no real backend/roles yet, so this is just a nickname check like every
// other "login" on this prototype) so a regular creator browsing around
// doesn't stumble onto the page that scores their own submissions.
function irIsGm() {
  const user = typeof bearipGetUser === 'function' ? bearipGetUser() : null;
  return !!(user && user.nickname === 'GM');
}

function irShowGmLocked() {
  const filterRow = document.getElementById('irFilterRow');
  const list = document.getElementById('irList');
  const empty = document.getElementById('irEmpty');
  const locked = document.getElementById('irGmLocked');
  if (filterRow) filterRow.style.display = 'none';
  if (list) list.style.display = 'none';
  if (empty) empty.style.display = 'none';
  if (locked) locked.style.display = 'flex';
  const loginBtn = document.getElementById('irGmLoginBtn');
  if (loginBtn) loginBtn.addEventListener('click', () => bearipGoToLogin('ip-reviews.html'));
}

const IR_STATUS_LABEL = { pending: '검토 대기', reviewed: '전문가 진단 완료' };

function irFormatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function irFormatRelativeTime(iso) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

let irActiveFilter = 'all';

// Accepts the current shape (an array of registered items — e.g. 시나리오의
// 1화/2화 등 여러 개) or, defensively, an older single-object review record
// from before a step could hold more than one, so past requests still render.
function irSubmissionEntryHtml(sub) {
  const label = sub.label ? `<div class="ir-submission-label">${bearipEscapeHtml(sub.label)}</div>` : '';
  const thumb = sub.imageData
    ? `<div class="ir-submission-thumb" style="background-image:url('${sub.imageData}')" data-full="${sub.imageData}" title="눌러서 크게 보기"></div>`
    : '';
  // fileData (워드/PDF/텍스트/음향) is an actual openable file, not just a
  // name — audio plays inline, everything else links out to open/save it,
  // rather than just naming that something was uploaded.
  const fileMeta = sub.fileSize ? ` · ${irFormatFileSize(sub.fileSize)}` : '';
  const isAudio = !sub.imageData && sub.fileData && typeof bearipIsAudioSubmission === 'function' && bearipIsAudioSubmission(sub);
  const file = !sub.imageData && sub.fileName
    ? isAudio
      ? `<div class="ir-submission-audio"><div class="ir-submission-file plain">${bearipEscapeHtml(sub.fileName)}${fileMeta}</div><audio controls preload="metadata" src="${sub.fileData}"></audio></div>`
      : sub.fileData
        ? `<a class="ir-submission-file" href="${sub.fileData}" download="${bearipEscapeHtml(sub.fileName)}" target="_blank" rel="noopener">${bearipEscapeHtml(sub.fileName)}${fileMeta}</a>`
        : `<div class="ir-submission-file">${bearipEscapeHtml(sub.fileName)}${fileMeta}</div>`
    : '';
  const note = sub.note ? `<div class="ir-submission-note">"${bearipEscapeHtml(sub.note)}"</div>` : '';
  return `<div class="ir-submission">${label}${thumb}${file}${note}</div>`;
}

function irSubmissionHtml(subs) {
  if (!subs) return '';
  const list = Array.isArray(subs) ? subs : [subs];
  return list.map(irSubmissionEntryHtml).join('');
}

// Submission thumbnails render small by default (a full-size image forced
// into a fixed thumb box used to dominate the whole card) — click one to see
// it at full size instead. Built once and reused, same pattern as
// production-requests.js's own confirm modal.
function irEnsureImageLightbox() {
  let overlay = document.getElementById('irImageLightbox');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'ir-lightbox-overlay';
  overlay.id = 'irImageLightbox';
  overlay.innerHTML = `
    <button type="button" class="ir-lightbox-close" aria-label="닫기">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
    <img class="ir-lightbox-img" id="irLightboxImg" alt="">
  `;
  (document.querySelector('.dna-app') || document.body).appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('.ir-lightbox-close')) irCloseImageLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('show')) irCloseImageLightbox();
  });
  return overlay;
}

function irOpenImageLightbox(src) {
  if (!src) return;
  const overlay = irEnsureImageLightbox();
  document.getElementById('irLightboxImg').src = src;
  overlay.classList.add('show');
}

function irCloseImageLightbox() {
  const overlay = document.getElementById('irImageLightbox');
  if (overlay) overlay.classList.remove('show');
}

// Groups the flat request list by IP so each IP's 종합 코멘트 (overall,
// IP-wide — separate from each step's own comment) sits once above that
// IP's own step cards, instead of repeating a field that isn't per-step.
function irGroupByIp(list) {
  const order = [];
  const map = new Map();
  list.forEach((r) => {
    if (!map.has(r.ipId)) {
      map.set(r.ipId, { ipId: r.ipId, ipTitle: r.ipTitle, items: [] });
      order.push(r.ipId);
    }
    map.get(r.ipId).items.push(r);
  });
  return order.map((id) => map.get(id));
}

function irOverallCommentHtml(ipId) {
  const comment = typeof bearipGetIpOverallComment === 'function' ? bearipGetIpOverallComment(ipId) : '';
  return `
    <div class="ir-overall">
      <span class="ir-overall-label">종합 코멘트 (전문가 준비도 아래 MY DNA에 표시돼요)</span>
      <textarea class="ir-overall-textarea" data-ip-id="${ipId}" placeholder="예: 캐릭터와 세계관은 잘 준비되어 있지만, 영상 제작을 위해 스토리보드와 사운드 방향 보완이 필요합니다.">${bearipEscapeHtml(comment)}</textarea>
      <button type="button" class="ir-overall-save" data-ip-id="${ipId}">저장</button>
    </div>
  `;
}

function irRenderList() {
  const list = document.getElementById('irList');
  const empty = document.getElementById('irEmpty');
  if (!list || !empty) return;

  const all = typeof bearipLoadIpReviews === 'function' ? bearipLoadIpReviews() : [];
  const filtered = irActiveFilter === 'all' ? all : all.filter((r) => r.status === irActiveFilter);

  if (!filtered.length) {
    list.innerHTML = '';
    list.style.display = 'none';
    empty.style.display = 'flex';
    return;
  }
  list.style.display = 'flex';
  empty.style.display = 'none';

  const groups = irGroupByIp(filtered);
  list.innerHTML = groups
    .map(
      (g) => `
    <div class="ir-ip-group">
      <div class="ir-ip-group-title">${bearipEscapeHtml(g.ipTitle || '제목 없는 IP')}</div>
      ${irOverallCommentHtml(g.ipId)}
      ${g.items
        .map(
          (r) => `
        <div class="pr-card">
          <div class="pr-card-top">
            <div class="pr-card-ip">${bearipEscapeHtml(r.stepLabel)}</div>
            <span class="pr-status ${r.status === 'reviewed' ? 'done' : 'pending'}">${IR_STATUS_LABEL[r.status] || r.status}</span>
          </div>
          <div class="pr-card-meta"><span>${irFormatRelativeTime(r.requestedAt)}</span></div>
          ${r.requesterNote ? `<div class="ir-requester-note"><span class="lbl">요청자 메모</span>"${bearipEscapeHtml(r.requesterNote)}"</div>` : ''}
          ${irSubmissionHtml(r.submissions || r.submission)}
          ${
            r.status === 'reviewed'
              ? `<div class="pr-card-result"><span>전문가 준비도 ${r.adminProgress}%${r.needsRevision ? ' · 보완 필요' : ''}</span>${r.adminComment ? bearipEscapeHtml(r.adminComment) : ''}</div>`
              : ''
          }
          ${typeof bearipRenderResultFileHtml === 'function' ? bearipRenderResultFileHtml(r, 'pr-result') : ''}
          <div class="pr-card-actions">
            <button type="button" class="ir-review-btn" data-id="${r.id}">${r.status === 'reviewed' ? '다시 검토하기' : '검토하기'}</button>
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `
    )
    .join('');

  list.querySelectorAll('.ir-review-btn').forEach((btn) => {
    btn.addEventListener('click', () => irOpenReviewModal(btn.dataset.id));
  });
  list.querySelectorAll('.ir-submission-thumb').forEach((thumb) => {
    thumb.addEventListener('click', () => irOpenImageLightbox(thumb.dataset.full));
  });
  list.querySelectorAll('.ir-overall-save').forEach((btn) => {
    btn.addEventListener('click', () => {
      const textarea = list.querySelector(`.ir-overall-textarea[data-ip-id="${btn.dataset.ipId}"]`);
      irSaveOverallComment(btn.dataset.ipId, textarea ? textarea.value.trim() : '');
    });
  });
}

function irSaveOverallComment(ipId, comment) {
  bearipSetIpOverallComment(ipId, comment || null);
  bearipShowToast('종합 코멘트를 저장했어요');
}

// The result file picked in the modal below, staged until 전문가 진단 완료로
// 저장 actually submits — same pattern as production-requests.js's own
// prResultPending.
let irResultPending = null;

// Built and appended fresh, removed on close — same pattern as
// production-requests.js's own confirm modal. Reuses its .pr-result-upload
// styling (production-requests.css is already loaded here for .pr-card etc.)
function irOpenReviewModal(id) {
  const req = (typeof bearipLoadIpReviews === 'function' ? bearipLoadIpReviews() : []).find((r) => r.id === id);
  if (!req) return;
  irResultPending = null;

  const overlay = document.createElement('div');
  overlay.className = 'pr-confirm-overlay';
  overlay.innerHTML = `
    <div class="pr-confirm-box">
      <div class="pr-confirm-title">'${bearipEscapeHtml(req.ipTitle)}'의 '${bearipEscapeHtml(req.stepLabel)}' 검토</div>
      <div class="pr-confirm-desc">이 항목의 전문가 준비도를 0~100% 사이로 매기고, 그 이유를 한 줄로 남겨주세요. 요청자에게 알림으로 전달돼요.</div>
      ${req.requesterNote ? `<div class="ir-requester-note"><span class="lbl">요청자 메모</span>"${bearipEscapeHtml(req.requesterNote)}"</div>` : ''}
      <label class="pr-confirm-label" for="irReviewProgress">전문가 준비도 (%)</label>
      <input type="number" id="irReviewProgress" class="ir-confirm-number" min="0" max="100" step="1" value="${req.adminProgress != null ? req.adminProgress : ''}" placeholder="예: 70">
      <label class="ir-confirm-checkbox-row">
        <input type="checkbox" id="irReviewNeedsRevision"${req.needsRevision ? ' checked' : ''}>
        보완이 필요해요
      </label>
      <label class="pr-confirm-label" for="irReviewComment">코멘트</label>
      <textarea id="irReviewComment" class="pr-confirm-textarea" placeholder="이 점수를 준 이유를 한 줄로 적어주세요.">${req.adminComment ? bearipEscapeHtml(req.adminComment) : ''}</textarea>
      <label class="pr-confirm-label" for="irResultFileInput">참고 파일 (선택)</label>
      <div class="pr-result-upload" id="irResultUpload">
        <input type="file" id="irResultFileInput" accept="image/*,audio/*,.pdf,.doc,.docx,.txt,.mp3,.wav" style="display:none">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 15l5-5 4 4 4-4 5 5"/><circle cx="8" cy="9" r="1.4"/></svg>
        <div class="t">클릭해서 참고 파일 업로드</div>
        <div class="d">수정 예시, 참고 이미지 등 — 이미지, PDF, 워드, 텍스트, 음향(mp3/wav) 최대 5MB</div>
      </div>
      <div class="pr-confirm-actions">
        <button type="button" class="pr-confirm-cancel">취소</button>
        <button type="button" class="pr-confirm-submit done">전문가 진단 완료로 저장</button>
      </div>
    </div>
  `;
  (document.querySelector('.dna-app') || document.body).appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('.pr-confirm-cancel').addEventListener('click', close);

  const uploadEl = overlay.querySelector('#irResultUpload');
  const fileInput = overlay.querySelector('#irResultFileInput');
  uploadEl.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    uploadEl.classList.remove('error');
    const setError = (msg) => {
      uploadEl.classList.add('error');
      uploadEl.querySelector('.d').textContent = msg;
    };
    if (file.type.startsWith('image/')) {
      try {
        const imageData = await bearipResizeImageToDataUrl(file, 720, 0.85);
        irResultPending = { imageData, fileData: null, fileName: file.name, fileSize: file.size, mime: file.type };
        uploadEl.classList.add('has-file');
        uploadEl.style.backgroundImage = `url('${imageData}')`;
        uploadEl.querySelector('.t').textContent = file.name;
      } catch (e) {
        setError(e.message || '이미지를 불러오지 못했어요');
      }
    } else if (typeof bearipIsInlineAttachmentFile === 'function' && bearipIsInlineAttachmentFile(file)) {
      if (file.size > BEARIP_MAX_INLINE_FILE_BYTES) {
        setError('파일은 최대 5MB까지 첨부할 수 있어요');
        return;
      }
      try {
        const fileData = await bearipReadFileAsDataUrl(file);
        irResultPending = { imageData: null, fileData, fileName: file.name, fileSize: file.size, mime: file.type };
        uploadEl.classList.add('has-file');
        uploadEl.querySelector('.t').textContent = file.name;
      } catch (e) {
        setError(e.message || '파일을 불러오지 못했어요');
      }
    } else {
      setError('지원하지 않는 파일 형식이에요');
    }
  });

  overlay.querySelector('.pr-confirm-submit').addEventListener('click', () => {
    const raw = document.getElementById('irReviewProgress').value;
    const progress = Math.max(0, Math.min(100, parseInt(raw, 10) || 0));
    const needsRevision = document.getElementById('irReviewNeedsRevision').checked;
    const comment = document.getElementById('irReviewComment').value.trim();
    irApplyReview(req, progress, needsRevision, comment, irResultPending);
    close();
  });
}

function irApplyReview(req, progress, needsRevision, comment, resultFile) {
  const reviewedAt = new Date().toISOString();
  const patch = { status: 'reviewed', adminProgress: progress, adminComment: comment, needsRevision, reviewedAt };
  if (resultFile) {
    patch.resultImageData = resultFile.imageData || null;
    patch.resultFileData = resultFile.fileData || null;
    patch.resultFileName = resultFile.fileName || null;
    patch.resultFileSize = resultFile.fileSize || null;
    patch.resultMime = resultFile.mime || null;
  }
  bearipUpdateIpReview(req.id, patch);
  // GM is on its own device/account now, with no access to the requester's
  // local IP data — the requester's own MY DNA pulls this result in itself
  // (see mdReconcileRemoteStatus in my-dna-render.js) once the update above
  // lands, instead of this page reaching into the IP directly like it used to.

  bearipAddNotification(
    {
      type: 'ip',
      title: '전문가 검토 결과가 도착했어요',
      message: `'${req.ipTitle}'의 '${req.stepLabel}' 항목이 ${progress}%로 진단됐어요.${needsRevision ? ' 보완이 필요해요.' : ''}${resultFile ? ' 참고 파일을 확인해보세요.' : ''}${comment ? ` "${comment}"` : ''}`,
      link: 'my-dna.html',
    },
    req.requesterNickname
  );

  irRenderList();
  bearipShowToast('검토 결과를 저장했어요');
}

document.getElementById('irFilterRow').addEventListener('click', (e) => {
  const btn = e.target.closest('.pr-filter-btn');
  if (!btn) return;
  document.querySelectorAll('#irFilterRow .pr-filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  irActiveFilter = btn.dataset.filter;
  irRenderList();
});

document.addEventListener('DOMContentLoaded', () => {
  if (!irIsGm()) {
    irShowGmLocked();
    return;
  }
  irRenderList();
  if (typeof bearipOnDataChange === 'function') bearipOnDataChange('ipReviews', irRenderList);
});
