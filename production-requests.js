// "제작요청 관리" — lets whoever's fulfilling requests (page admin/expert,
// stood in here by the same single mock account) see every 제작요청 across
// every IP and move it to 완료 (done) or 거절 (rejected, refunded) — closing
// the loop MY DNA's own 제작요청 tab left open at "검토 대기".

const PR_STATUS_LABEL = { pending: '검토 대기', done: '완료', cancelled: '취소됨', rejected: '거절됨' };

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
  const filtered = prActiveFilter === 'all' ? all : all.filter((r) => r.status === prActiveFilter);

  if (!filtered.length) {
    list.innerHTML = '';
    list.style.display = 'none';
    empty.style.display = 'flex';
    return;
  }
  list.style.display = 'flex';
  empty.style.display = 'none';

  list.innerHTML = filtered
    .map(
      (r) => `
    <div class="pr-card">
      <div class="pr-card-top">
        <div class="pr-card-ip">${bearipEscapeHtml(r.ipTitle || '제목 없는 IP')}</div>
        <span class="pr-status ${r.status}">${PR_STATUS_LABEL[r.status] || r.status}</span>
      </div>
      <div class="pr-card-label">${bearipEscapeHtml(r.label)}</div>
      <div class="pr-card-meta"><span>${r.price}C</span><span>${prFormatRelativeTime(r.requestedAt)}</span></div>
      ${r.detail ? `<div class="pr-card-detail">"${bearipEscapeHtml(r.detail)}"</div>` : ''}
      ${r.resultNote ? `<div class="pr-card-result"><span>완료 메모</span>${bearipEscapeHtml(r.resultNote)}</div>` : ''}
      ${
        r.status === 'pending'
          ? `<div class="pr-card-actions">
               <button type="button" class="pr-complete-btn" data-id="${r.id}">완료 처리</button>
               <button type="button" class="pr-reject-btn" data-id="${r.id}">거절</button>
             </div>`
          : ''
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
}

// Built and appended fresh, removed on close — same as my-projects.js's
// delete-confirm modal, avoiding a persistent overlay's display/hidden footgun.
function prOpenAction(id, kind) {
  const req = (typeof bearipLoadProductionRequests === 'function' ? bearipLoadProductionRequests() : []).find(
    (r) => r.id === id
  );
  if (!req) return;

  const isDone = kind === 'done';
  const overlay = document.createElement('div');
  overlay.className = 'pr-confirm-overlay';
  overlay.innerHTML = `
    <div class="pr-confirm-box">
      <div class="pr-confirm-title">'${bearipEscapeHtml(req.ipTitle)}'의 '${bearipEscapeHtml(req.label)}'을(를) ${isDone ? '완료 처리' : '거절'}할까요?</div>
      <div class="pr-confirm-desc">${
        isDone
          ? '요청자에게 완료 알림이 전달돼요.'
          : `요청자에게 거절 알림이 전달되고, 결제했던 ${req.price}C가 환불돼요.`
      }</div>
      <label class="pr-confirm-label" for="prActionNote">${isDone ? '완료 메모 (선택)' : '거절 사유 (선택)'}</label>
      <textarea id="prActionNote" class="pr-confirm-textarea" placeholder="${
        isDone ? '전달할 결과물 링크나 요약을 적어주세요.' : '거절 사유를 적어주세요.'
      }"></textarea>
      <div class="pr-confirm-actions">
        <button type="button" class="pr-confirm-cancel">취소</button>
        <button type="button" class="pr-confirm-submit ${isDone ? 'done' : 'reject'}">${isDone ? '완료 처리하기' : '거절하기'}</button>
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
    const note = document.getElementById('prActionNote').value.trim();
    prApplyAction(req, kind, note);
    close();
  });
}

// Mirrors the self/requested flag mdSetDnaProductionMode/mdSetRoadmapProductionMode
// (my-dna-render.js) write on the IP itself — done here directly since this
// page doesn't load my-dna-render.js. 'done' shows as a finished tag with
// nothing left to cancel; a rejection reverts to 'self' so re-requesting works.
function prSyncIpMode(req, mode) {
  const ips = typeof bearipLoadIPs === 'function' ? bearipLoadIPs() : [];
  const ip = ips.find((i) => i.id === req.ipId);
  if (!ip) return;
  if (req.scope === 'dna') {
    const dnaProductionMode = Object.assign({}, ip.dnaProductionMode, { [req.key]: mode });
    bearipUpdateIP(ip.id, { dnaProductionMode });
  } else {
    const roadmap = (ip.roadmap || []).map((s) => (s.key === req.key ? Object.assign({}, s, { mode }) : s));
    bearipUpdateIP(ip.id, { roadmap });
  }
}

function prApplyAction(req, kind, note) {
  const patch = { status: kind };
  if (kind === 'done') patch.resultNote = note;
  bearipUpdateProductionRequest(req.id, patch);
  prSyncIpMode(req, kind === 'done' ? 'done' : 'self');

  if (kind === 'rejected') {
    bearipAddCredits(req.price);
    if (typeof bearipRefreshCreditDisplays === 'function') bearipRefreshCreditDisplays();
  }

  bearipAddNotification({
    type: 'production',
    title: kind === 'done' ? '제작이 완료됐어요' : '제작요청이 거절됐어요',
    message:
      kind === 'done'
        ? `'${req.ipTitle}'의 '${req.label}' 제작이 완료됐어요.${note ? ` ${note}` : ''}`
        : `'${req.ipTitle}'의 '${req.label}' 제작요청이 거절됐어요. ${req.price}C를 환불했어요.${note ? ` 사유: ${note}` : ''}`,
    link: 'my-dna.html',
  });

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

document.addEventListener('DOMContentLoaded', prRenderList);
