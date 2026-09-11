// "IP 심사 관리" — lets whoever's reviewing (page admin, stood in here by the
// same single mock account) see every roadmap-step submission from new-ip.html's
// 1차 등록 and set a 0-100 진행도 + one-line 코멘트 per step. Separate from
// 제작요청 관리 (production-requests.js): that's about outsourcing a step to a
// Creator; this is the admin scoring how complete/real the creator's own
// submitted material already is. Results are written back onto the IP's own
// roadmap[i] (see irSyncIpStep) so MY DNA can show them without reading this list.

const IR_STATUS_LABEL = { pending: '심사 대기', reviewed: '심사 완료' };

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

function irSubmissionHtml(sub) {
  if (!sub) return '';
  const thumb = sub.imageData ? `<div class="ir-submission-thumb" style="background-image:url('${sub.imageData}')"></div>` : '';
  const file = !sub.imageData && sub.fileName ? `<div class="ir-submission-file">${bearipEscapeHtml(sub.fileName)}${sub.fileSize ? ` · ${irFormatFileSize(sub.fileSize)}` : ''}</div>` : '';
  const note = sub.note ? `<div class="ir-submission-note">"${bearipEscapeHtml(sub.note)}"</div>` : '';
  return `<div class="ir-submission">${thumb}${file}${note}</div>`;
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

  list.innerHTML = filtered
    .map(
      (r) => `
    <div class="pr-card">
      <div class="pr-card-top">
        <div class="pr-card-ip">${bearipEscapeHtml(r.ipTitle || '제목 없는 IP')}</div>
        <span class="pr-status ${r.status === 'reviewed' ? 'done' : 'pending'}">${IR_STATUS_LABEL[r.status] || r.status}</span>
      </div>
      <div class="pr-card-label">${bearipEscapeHtml(r.stepLabel)}</div>
      <div class="pr-card-meta"><span>${irFormatRelativeTime(r.requestedAt)}</span></div>
      ${irSubmissionHtml(r.submission)}
      ${
        r.status === 'reviewed'
          ? `<div class="pr-card-result"><span>관리자 진행도 ${r.adminProgress}%</span>${r.adminComment ? bearipEscapeHtml(r.adminComment) : ''}</div>`
          : ''
      }
      <div class="pr-card-actions">
        <button type="button" class="ir-review-btn" data-id="${r.id}">${r.status === 'reviewed' ? '다시 심사하기' : '심사하기'}</button>
      </div>
    </div>
  `
    )
    .join('');

  list.querySelectorAll('.ir-review-btn').forEach((btn) => {
    btn.addEventListener('click', () => irOpenReviewModal(btn.dataset.id));
  });
}

// Built and appended fresh, removed on close — same pattern as
// production-requests.js's own confirm modal.
function irOpenReviewModal(id) {
  const req = (typeof bearipLoadIpReviews === 'function' ? bearipLoadIpReviews() : []).find((r) => r.id === id);
  if (!req) return;

  const overlay = document.createElement('div');
  overlay.className = 'pr-confirm-overlay';
  overlay.innerHTML = `
    <div class="pr-confirm-box">
      <div class="pr-confirm-title">'${bearipEscapeHtml(req.ipTitle)}'의 '${bearipEscapeHtml(req.stepLabel)}' 심사</div>
      <div class="pr-confirm-desc">이 항목의 진행도를 0~100% 사이로 매기고, 그 이유를 한 줄로 남겨주세요. 요청자에게 알림으로 전달돼요.</div>
      <label class="pr-confirm-label" for="irReviewProgress">진행도 (%)</label>
      <input type="number" id="irReviewProgress" class="ir-confirm-number" min="0" max="100" step="1" value="${req.adminProgress != null ? req.adminProgress : ''}" placeholder="예: 70">
      <label class="pr-confirm-label" for="irReviewComment">코멘트</label>
      <textarea id="irReviewComment" class="pr-confirm-textarea" placeholder="이 점수를 준 이유를 한 줄로 적어주세요.">${req.adminComment ? bearipEscapeHtml(req.adminComment) : ''}</textarea>
      <div class="pr-confirm-actions">
        <button type="button" class="pr-confirm-cancel">취소</button>
        <button type="button" class="pr-confirm-submit done">심사 완료로 저장</button>
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
    const raw = document.getElementById('irReviewProgress').value;
    const progress = Math.max(0, Math.min(100, parseInt(raw, 10) || 0));
    const comment = document.getElementById('irReviewComment').value.trim();
    irApplyReview(req, progress, comment);
    close();
  });
}

// Mirrors the result onto the IP's own roadmap[i] — same reasoning as
// production-requests.js's prSyncIpMode, done here directly since this page
// doesn't load my-dna-render.js.
function irSyncIpStep(req, progress, comment) {
  const ips = typeof bearipLoadIPs === 'function' ? bearipLoadIPs() : [];
  const ip = ips.find((i) => i.id === req.ipId);
  if (!ip) return;
  const roadmap = (ip.roadmap || []).map((s) =>
    s.key === req.stepKey
      ? Object.assign({}, s, { reviewStatus: 'reviewed', adminProgress: progress, adminComment: comment, adminReviewedAt: new Date().toISOString() })
      : s
  );
  bearipUpdateIP(ip.id, { roadmap });
}

function irApplyReview(req, progress, comment) {
  const reviewedAt = new Date().toISOString();
  bearipUpdateIpReview(req.id, { status: 'reviewed', adminProgress: progress, adminComment: comment, reviewedAt });
  irSyncIpStep(req, progress, comment);

  bearipAddNotification({
    type: 'ip',
    title: '심사 결과가 도착했어요',
    message: `'${req.ipTitle}'의 '${req.stepLabel}' 항목이 ${progress}%로 심사됐어요.${comment ? ` "${comment}"` : ''}`,
    link: 'my-dna.html',
  });

  irRenderList();
  bearipShowToast('심사 결과를 저장했어요');
}

document.getElementById('irFilterRow').addEventListener('click', (e) => {
  const btn = e.target.closest('.pr-filter-btn');
  if (!btn) return;
  document.querySelectorAll('#irFilterRow .pr-filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  irActiveFilter = btn.dataset.filter;
  irRenderList();
});

document.addEventListener('DOMContentLoaded', irRenderList);
