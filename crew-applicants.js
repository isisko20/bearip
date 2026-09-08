// "지원자 관리" — consolidates every posting the user has created (via CREW
// MATCH's "모집글 올리기") into one page, so 승낙/거절 doesn't require opening
// each posting card on crew-match.html one at a time. Reads/writes the same
// bearip_positions / bearip_position_applicants stores crew-match-post.js
// uses, so both pages stay in sync (no live two-way binding, just shared
// persisted state re-read on load, same as everywhere else in this app).

const CA_APPLICANT_STATUS_LABEL = { pending: '검토 중', accepted: '수락됨', rejected: '거절됨' };

function caFormatRelativeTime(iso) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

let caActiveFilter = 'all';

function caApplicantRowHtml(posId, a) {
  const actions =
    a.status === 'pending'
      ? `<button type="button" class="ca-applicant-accept" data-pos-id="${posId}" data-app-id="${a.id}">승낙</button>
         <button type="button" class="ca-applicant-reject" data-pos-id="${posId}" data-app-id="${a.id}">거절</button>`
      : `<span class="ca-applicant-status ${a.status}">${CA_APPLICANT_STATUS_LABEL[a.status] || a.status}</span>`;
  return `
    <div class="ca-applicant-item">
      <div class="ca-applicant-row">
        <button type="button" class="ca-applicant-name" data-info-id="${a.id}">${bearipEscapeHtml(a.name)}</button>
        <span class="ca-applicant-time">${caFormatRelativeTime(a.appliedAt)}</span>
        <span class="ca-applicant-actions">${actions}</span>
      </div>
      <div class="ca-applicant-detail" id="ca-applicant-detail-${a.id}" hidden>
        <div class="ca-applicant-detail-role">${bearipEscapeHtml(a.role || '역할 미지정')}</div>
        <div class="ca-applicant-detail-bio">${bearipEscapeHtml(a.bio || '아직 작성된 소개가 없어요.')}</div>
        ${a.portfolioCount ? `<div class="ca-applicant-detail-portfolio">포트폴리오 ${a.portfolioCount}개</div>` : ''}
        ${a.message ? `<div class="ca-applicant-detail-message">"${bearipEscapeHtml(a.message)}"</div>` : ''}
      </div>
    </div>
  `;
}

function caCardHtml(pos) {
  const applicants = bearipGetApplicants(pos.id);
  const tagsHtml = (pos.tags || []).map((t) => `<span>${bearipEscapeHtml(t)}</span>`).join('');
  const applicantsHtml = applicants.length
    ? applicants.map((a) => caApplicantRowHtml(pos.id, a)).join('')
    : '<div class="ca-applicants-empty">아직 지원자가 없어요.</div>';

  return `
    <div class="ca-card">
      <div class="ca-card-top">
        <div class="ca-thumb ${pos.thumb || 'thumb-3'}"></div>
        <div class="ca-card-info">
          <div class="ca-ip">${bearipEscapeHtml(pos.ipTitle)}</div>
          <div class="ca-role">${bearipEscapeHtml(pos.role)} 모집</div>
          <div class="ca-tags">${tagsHtml}</div>
        </div>
        <div class="ca-card-meta">
          <div class="frac">${pos.filled || 0}/${pos.count}</div>
          <div class="deadline">${bearipEscapeHtml(pos.deadlineText || '상시 모집')}</div>
        </div>
      </div>
      <div class="ca-applicants">${applicantsHtml}</div>
    </div>
  `;
}

function caHasPendingApplicant(pos) {
  return bearipGetApplicants(pos.id).some((a) => a.status === 'pending');
}

function caRenderList() {
  const list = document.getElementById('caList');
  const empty = document.getElementById('caEmpty');
  const emptyTitle = document.getElementById('caEmptyTitle');
  const emptyDesc = document.getElementById('caEmptyDesc');
  if (!list || !empty) return;

  const all = typeof bearipLoadPositions === 'function' ? bearipLoadPositions() : [];
  const filtered = caActiveFilter === 'pending' ? all.filter(caHasPendingApplicant) : all;

  if (!filtered.length) {
    list.innerHTML = '';
    list.style.display = 'none';
    empty.style.display = 'flex';
    if (!all.length) {
      emptyTitle.textContent = '아직 올린 모집글이 없어요';
      emptyDesc.textContent = 'CREW MATCH에서 모집글을 올리면 여기서 지원자를 관리할 수 있어요.';
    } else {
      emptyTitle.textContent = '대기 중인 지원자가 없어요';
      emptyDesc.textContent = '모든 지원자를 이미 처리했어요.';
    }
    return;
  }
  list.style.display = 'flex';
  empty.style.display = 'none';
  list.innerHTML = filtered.map(caCardHtml).join('');

  list.querySelectorAll('.ca-applicant-name').forEach((btn) => {
    btn.addEventListener('click', () => {
      const detail = document.getElementById(`ca-applicant-detail-${btn.dataset.infoId}`);
      if (detail) detail.hidden = !detail.hidden;
    });
  });
  list.querySelectorAll('.ca-applicant-accept, .ca-applicant-reject').forEach((btn) => {
    btn.addEventListener('click', () => {
      const accepting = btn.classList.contains('ca-applicant-accept');
      caUpdateApplicant(btn.dataset.posId, btn.dataset.appId, accepting ? 'accepted' : 'rejected');
    });
  });
}

function caUpdateApplicant(posId, appId, status) {
  const updated = bearipUpdateApplicantStatus(posId, appId, status);
  if (!updated) return;

  if (status === 'accepted') {
    const pos = (typeof bearipLoadPositions === 'function' ? bearipLoadPositions() : []).find((p) => p.id === posId);
    if (pos) {
      const newFilled = Math.min((pos.filled || 0) + 1, pos.count);
      bearipUpdatePosition(posId, { filled: newFilled });
    }
  }

  bearipAddNotification({
    type: 'crew',
    title: status === 'accepted' ? '지원자를 수락했어요' : '지원자를 거절했어요',
    message:
      status === 'accepted'
        ? `'${updated.name}'님의 지원을 수락했어요.`
        : `'${updated.name}'님의 지원을 거절했어요.`,
    link: 'crew-match.html',
  });

  bearipShowToast(status === 'accepted' ? '지원자를 수락했어요' : '지원자를 거절했어요');
  caRenderList();
}

document.getElementById('caFilterRow').addEventListener('click', (e) => {
  const btn = e.target.closest('.ca-filter-btn');
  if (!btn) return;
  document.querySelectorAll('.ca-filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  caActiveFilter = btn.dataset.filter;
  caRenderList();
});

document.addEventListener('DOMContentLoaded', caRenderList);
