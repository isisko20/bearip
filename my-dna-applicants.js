// "지원자 확인" — shows pending applicants across all CREW MATCH postings
// tied to the currently-viewed IP, with accept/reject right here on the
// project's own page instead of requiring a trip to CREW MATCH.

function mdFormatApplicantTime(iso) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

function mdRenderApplicantsAlert() {
  const alertEl = document.getElementById('mdApplicantsAlert');
  const listEl = document.getElementById('mdApplicantsList');
  if (!alertEl || !listEl || typeof currentIP === 'undefined' || !currentIP) return;

  const positions = (typeof bearipLoadPositions === 'function' ? bearipLoadPositions() : []).filter(
    (p) => p.ipTitle === currentIP.title
  );
  const rows = [];
  positions.forEach((pos) => {
    const applicants = typeof bearipGetApplicants === 'function' ? bearipGetApplicants(pos.id) : [];
    applicants.filter((a) => a.status === 'pending').forEach((a) => rows.push({ pos, applicant: a }));
  });

  if (rows.length === 0) {
    alertEl.style.display = 'none';
    listEl.innerHTML = '';
    return;
  }
  alertEl.style.display = '';

  listEl.innerHTML = rows
    .map(
      ({ pos, applicant }) => `
      <div class="md-applicant-item">
        <div class="md-applicant-row">
          <button type="button" class="md-applicant-name" data-info-id="${applicant.id}">${bearipEscapeHtml(applicant.name)}</button>
          <span class="md-applicant-meta">${bearipEscapeHtml(pos.role)} 지원 · ${mdFormatApplicantTime(applicant.appliedAt)}</span>
          <span class="md-applicant-actions">
            <button type="button" class="md-applicant-accept" data-pos-id="${pos.id}" data-app-id="${applicant.id}">승낙</button>
            <button type="button" class="md-applicant-reject" data-pos-id="${pos.id}" data-app-id="${applicant.id}">거절</button>
          </span>
        </div>
        <div class="md-applicant-detail" id="md-applicant-detail-${applicant.id}" style="display:none">
          <div class="md-applicant-detail-role">${bearipEscapeHtml(applicant.role || '역할 미지정')}</div>
          <div class="md-applicant-detail-bio">${bearipEscapeHtml(applicant.bio || '아직 작성된 소개가 없어요.')}</div>
          ${applicant.portfolioCount ? `<div class="md-applicant-detail-portfolio">공개된 포트폴리오 ${applicant.portfolioCount}개</div>` : '<div class="md-applicant-detail-portfolio">공개된 포트폴리오가 없어요.</div>'}
        </div>
      </div>
    `
    )
    .join('');

  listEl.querySelectorAll('.md-applicant-name').forEach((btn) => {
    btn.addEventListener('click', () => {
      const detail = document.getElementById(`md-applicant-detail-${btn.dataset.infoId}`);
      if (!detail) return;
      detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
    });
  });

  listEl.querySelectorAll('.md-applicant-accept, .md-applicant-reject').forEach((btn) => {
    btn.addEventListener('click', () => {
      const accepting = btn.classList.contains('md-applicant-accept');
      const posId = btn.dataset.posId;
      const updated = bearipUpdateApplicantStatus(posId, btn.dataset.appId, accepting ? 'accepted' : 'rejected');
      if (!updated) return;
      if (accepting) {
        const pos = bearipLoadPositions().find((p) => p.id === posId);
        if (pos) bearipUpdatePosition(posId, { filled: Math.min((pos.filled || 0) + 1, pos.count) });
      }
      bearipShowToast(accepting ? '지원자를 수락했어요' : '지원자를 거절했어요');
      mdRenderApplicantsAlert();
    });
  });
}

document.addEventListener('DOMContentLoaded', mdRenderApplicantsAlert);
