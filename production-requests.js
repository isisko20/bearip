// "제작요청 관리" — lets whoever's fulfilling requests (GM) see every
// 제작요청 across every IP/creator and move it to 완료 (done) or 거절
// (rejected, refunded) — closing the loop MY DNA's own 제작요청 tab left open
// at "검토 대기". Now backed by Firebase (see storage.js) so this is genuinely
// every creator's requests, not just requests made from this same browser —
// gated to GM the same way ip-reviews.js is, so a regular creator can't
// browse into (and act on) other people's requests.
const PR_STATUS_LABEL = { pending: '검토 대기', done: '완료', cancelled: '취소됨', rejected: '거절됨' };

function prIsGm() {
  const user = typeof bearipGetUser === 'function' ? bearipGetUser() : null;
  return !!(user && user.nickname === 'GM');
}

function prShowGmLocked() {
  const filterRow = document.getElementById('prFilterRow');
  const list = document.getElementById('prList');
  const empty = document.getElementById('prEmpty');
  const locked = document.getElementById('prGmLocked');
  if (filterRow) filterRow.style.display = 'none';
  if (list) list.style.display = 'none';
  if (empty) empty.style.display = 'none';
  if (locked) locked.style.display = 'flex';
  const loginBtn = document.getElementById('prGmLoginBtn');
  if (loginBtn) loginBtn.addEventListener('click', () => bearipGoToLogin('production-requests.html'));
}

function prFormatRelativeTime(iso) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

let prActiveFilter = 'all';

function prRenderList() {
  const list = document.getElementById('prList');
  const empty = document.getElementById('prEmpty');
  if (!list || !empty) return;

  const all = typeof bearipLoadProductionRequests === 'function' ? bearipLoadProductionRequests() : [];
  const filtered =
    prActiveFilter === 'trash'
      ? all.filter((r) => r.trashed)
      : prActiveFilter === 'all'
        ? all.filter((r) => !r.trashed)
        : all.filter((r) => !r.trashed && r.status === prActiveFilter);

  if (!filtered.length) {
    list.innerHTML = '';
    list.style.display = 'none';
    empty.style.display = 'flex';
    // Firebase's first sync can still be in flight — say so instead of
    // flatly claiming there's nothing, or a request that landed a moment
    // ago looks like it never arrived.
    const stillLoading = typeof bearipIsDataLoaded === 'function' && !bearipIsDataLoaded('productionRequests');
    const t = empty.querySelector('.t');
    const s = empty.querySelector('.s');
    if (t) t.textContent = stillLoading ? '불러오는 중이에요...' : '해당하는 제작요청이 없어요';
    if (s) s.textContent = stillLoading ? '' : 'MY DNA에서 누군가 제작을 요청하면 여기에 표시돼요.';
    return;
  }
  list.style.display = 'flex';
  empty.style.display = 'none';

  list.innerHTML = filtered
    .map(
      (r) => `
    <div class="pr-card">
      <div class="pr-card-top">
        <div class="pr-card-ip">${bearipEscapeHtml(r.ipTitle || '제목 없는 IP')}${r.isFollowup ? ' · 추가문의' : ''}</div>
        <span class="pr-status ${r.status}">${PR_STATUS_LABEL[r.status] || r.status}</span>
      </div>
      <div class="pr-card-label">${bearipEscapeHtml(r.label)}</div>
      <div class="pr-card-meta"><span>${r.isFollowup ? '추가문의' : r.price + 'C'}</span><span>${prFormatRelativeTime(r.requestedAt)}</span></div>
      ${r.detail ? `<div class="pr-card-detail">"${bearipEscapeHtml(r.detail)}"</div>` : ''}
      ${r.resultNote ? `<div class="pr-card-result"><span>완료 메모</span>${bearipEscapeHtml(r.resultNote)}</div>` : ''}
      ${bearipRenderResultFileHtml(r, 'pr-result')}
      ${
        r.status === 'pending'
          ? `<div class="pr-card-actions">
               <button type="button" class="pr-complete-btn" data-id="${r.id}">업로드</button>
               <button type="button" class="pr-reject-btn" data-id="${r.id}">피드백</button>
             </div>`
          : r.trashed
            ? `<div class="pr-card-actions">
                 <button type="button" class="pr-restore-btn" data-id="${r.id}">복구</button>
                 <button type="button" class="pr-purge-btn" data-id="${r.id}">영구 삭제</button>
               </div>`
            : `<div class="pr-card-actions">
                 <button type="button" class="pr-trash-btn" data-id="${r.id}">휴지통으로</button>
               </div>`
      }
    </div>
  `
    )
    .join('');

  list.querySelectorAll('.pr-complete-btn').forEach((btn) => {
    btn.addEventListener('click', () => prOpenAction(btn.dataset.id, 'done'));
  });
  list.querySelectorAll('.pr-reject-btn').forEach((btn) => {
    btn.addEventListener('click', () => prOpenAction(btn.dataset.id, 'rejected'));
  });
  list.querySelectorAll('.pr-trash-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (typeof bearipUpdateProductionRequest === 'function') {
        bearipUpdateProductionRequest(btn.dataset.id, { trashed: true, trashedAt: new Date().toISOString() });
      }
      prRenderList();
    });
  });
  list.querySelectorAll('.pr-restore-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (typeof bearipUpdateProductionRequest === 'function') {
        bearipUpdateProductionRequest(btn.dataset.id, { trashed: false, trashedAt: null });
      }
      prRenderList();
    });
  });
  list.querySelectorAll('.pr-purge-btn').forEach((btn) => {
    btn.addEventListener('click', () => prConfirmPurge(btn.dataset.id));
  });
}

// A native confirm() can be blocked outright in some embedded/sandboxed
// contexts this prototype gets viewed in — same reasoning as my-dna-render.js
// avoiding prompt() for the asset-add tile — so this reuses the same
// pr-confirm-overlay pattern prOpenAction already uses on this page instead.
function prConfirmPurge(id) {
  const overlay = document.createElement('div');
  overlay.className = 'pr-confirm-overlay';
  overlay.innerHTML = `
    <div class="pr-confirm-box">
      <div class="pr-confirm-title">완전히 삭제할까요?</div>
      <div class="pr-confirm-desc">휴지통에서 영구 삭제돼요. 되돌릴 수 없어요.</div>
      <div class="pr-confirm-actions">
        <button type="button" class="pr-confirm-cancel">취소</button>
        <button type="button" class="pr-confirm-submit reject">영구 삭제</button>
      </div>
    </div>
  `;
  (document.querySelector('.dna-app') || document.body).appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('.pr-confirm-cancel').addEventListener('click', close);
  overlay.querySelector('.pr-confirm-submit').addEventListener('click', () => {
    close();
    if (typeof bearipDeleteProductionRequest === 'function') bearipDeleteProductionRequest(id);
    prRenderList();
  });
}

// The result file picked in prOpenAction's modal, staged here until 완료
//처리하기 actually submits — mirrors stepMaterialWorkingEntries' pattern in
// my-dna-render.js, just for a single file instead of a list.
let prResultPending = null;

// Built and appended fresh, removed on close — same as my-projects.js's
// delete-confirm modal, avoiding a persistent overlay's display/hidden footgun.
function prOpenAction(id, kind) {
  const req = (typeof bearipLoadProductionRequests === 'function' ? bearipLoadProductionRequests() : []).find(
    (r) => r.id === id
  );
  if (!req) return;

  const isDone = kind === 'done';
  prResultPending = null;
  const overlay = document.createElement('div');
  overlay.className = 'pr-confirm-overlay';
  overlay.innerHTML = `
    <div class="pr-confirm-box">
      <div class="pr-confirm-title">'${bearipEscapeHtml(req.ipTitle)}'의 '${bearipEscapeHtml(req.label)}'을(를) ${isDone ? '업로드' : '피드백'}할까요?</div>
      <div class="pr-confirm-desc">${
        isDone
          ? '요청자에게 완료 알림이 전달돼요.'
          : `요청자에게 거절 알림이 전달되고, 결제했던 ${req.price}C가 환불돼요.`
      }</div>
      ${
        isDone
          ? `<label class="pr-confirm-label" for="prResultFileInput">결과물 파일 (선택)</label>
             <div class="pr-result-upload" id="prResultUpload">
               <input type="file" id="prResultFileInput" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.mp3,.wav,.mp4,.mov,.webm" style="display:none">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 15l5-5 4 4 4-4 5 5"/><circle cx="8" cy="9" r="1.4"/></svg>
               <div class="t">클릭해서 결과물 파일 업로드</div>
               <div class="d">이미지, 영상, PDF, 워드, 텍스트, 음향 — 최대 5MB</div>
             </div>
             <label class="pr-confirm-label" for="prResultLink">결과물 링크 (선택 — 영상처럼 5MB 넘는 파일은 구글드라이브 등에 올린 뒤 링크로 전달해주세요)</label>
             <input type="text" id="prResultLink" class="pr-confirm-input" placeholder="https://...">`
          : ''
      }
      <label class="pr-confirm-label" for="prActionNote">${isDone ? '완료 메모 (선택)' : '거절 사유 (선택)'}</label>
      <textarea id="prActionNote" class="pr-confirm-textarea" placeholder="${
        isDone ? '전달할 결과물에 대한 설명을 적어주세요.' : '거절 사유를 적어주세요.'
      }"></textarea>
      <div class="pr-confirm-actions">
        <button type="button" class="pr-confirm-cancel">취소</button>
        <button type="button" class="pr-confirm-submit ${isDone ? 'done' : 'reject'}">${isDone ? '업로드하기' : '피드백 보내기'}</button>
      </div>
    </div>
  `;
  (document.querySelector('.dna-app') || document.body).appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('.pr-confirm-cancel').addEventListener('click', close);

  if (isDone) {
    const uploadEl = overlay.querySelector('#prResultUpload');
    const fileInput = overlay.querySelector('#prResultFileInput');
    uploadEl.addEventListener('click', () => fileInput.click());
    if (typeof bearipEnableFileDrop === 'function') bearipEnableFileDrop(uploadEl, fileInput);
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
          prResultPending = { imageData, fileData: null, fileName: file.name, fileSize: file.size, mime: file.type };
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
          prResultPending = { imageData: null, fileData, fileName: file.name, fileSize: file.size, mime: file.type };
          uploadEl.classList.add('has-file');
          uploadEl.querySelector('.t').textContent = file.name;
        } catch (e) {
          setError(e.message || '파일을 불러오지 못했어요');
        }
      } else {
        setError('지원하지 않는 파일 형식이에요');
      }
    });
  }

  overlay.querySelector('.pr-confirm-submit').addEventListener('click', () => {
    const note = document.getElementById('prActionNote').value.trim();
    const linkInput = document.getElementById('prResultLink');
    const link = linkInput ? linkInput.value.trim() : '';
    prApplyAction(req, kind, note, prResultPending, link);
    close();
  });
}

function prApplyAction(req, kind, note, resultFile, resultLink) {
  const patch = { status: kind };
  if (kind === 'done') {
    patch.resultNote = note;
    if (resultFile) {
      patch.resultImageData = resultFile.imageData || null;
      patch.resultFileData = resultFile.fileData || null;
      patch.resultFileName = resultFile.fileName || null;
      patch.resultFileSize = resultFile.fileSize || null;
      patch.resultMime = resultFile.mime || null;
    }
    if (resultLink) patch.resultLink = resultLink;
  }
  bearipUpdateProductionRequest(req.id, patch);
  // GM is on its own device/account now, with no access to the requester's
  // local IP data — the requester's own MY DNA pulls this result (and, on a
  // rejection, refunds the credit) in itself once the update above lands,
  // via mdReconcileRemoteStatus in my-dna-render.js.

  bearipAddNotification(
    {
      type: 'production',
      title: kind === 'done' ? '제작이 완료됐어요' : '제작요청이 거절됐어요',
      message:
        kind === 'done'
          ? `'${req.ipTitle}'의 '${req.label}' 제작이 완료됐어요.${resultFile || resultLink ? ' 결과물을 확인해보세요.' : ''}${note ? ` ${note}` : ''}`
          : `'${req.ipTitle}'의 '${req.label}' 제작요청이 거절됐어요. ${req.price}C를 환불했어요.${note ? ` 사유: ${note}` : ''}`,
      link: 'my-dna.html',
    },
    req.requesterNickname
  );

  prRenderList();
  bearipShowToast(kind === 'done' ? '완료 처리했어요' : '요청을 거절했어요');
}

document.getElementById('prFilterRow').addEventListener('click', (e) => {
  const btn = e.target.closest('.pr-filter-btn');
  if (!btn) return;
  document.querySelectorAll('.pr-filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  prActiveFilter = btn.dataset.filter;
  prRenderList();
});

document.addEventListener('DOMContentLoaded', () => {
  if (!prIsGm()) {
    prShowGmLocked();
    return;
  }
  prRenderList();
  if (typeof bearipOnDataChange === 'function') bearipOnDataChange('productionRequests', prRenderList);
});
