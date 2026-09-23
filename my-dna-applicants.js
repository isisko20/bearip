// "지원자 확인" — shows pending requests tied to the currently-viewed IP, with
// accept/reject right here on the project's own page instead of requiring a
// trip elsewhere: people who applied to one of its CREW MATCH postings, and
// people who asked to join the IP itself (ip-detail.html's 참여하기).

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

  // Postings are shared now, so "this IP's postings" also has to mean YOURS —
  // someone else's IP could happen to share a title.
  const me = typeof bearipGetUser === 'function' ? bearipGetUser() : null;
  const positions = (typeof bearipLoadPositions === 'function' ? bearipLoadPositions() : []).filter(
    (p) => me && p.ownerNickname === me.nickname && (p.ipId ? p.ipId === currentIP.id : p.ipTitle === currentIP.title)
  );
  const rows = [];
  positions.forEach((pos) => {
    const applicants = typeof bearipGetApplicants === 'function' ? bearipGetApplicants(pos.id) : [];
    applicants
      .filter((a) => a.status === 'pending')
      .forEach((a) => rows.push({ kind: 'position', refId: pos.id, meta: `${pos.role} 지원`, applicant: a, at: a.appliedAt }));
  });
  const joinRequests = typeof bearipGetJoinRequests === 'function' ? bearipGetJoinRequests(currentIP.id) : [];
  joinRequests
    .filter((r) => r.status === 'pending')
    .forEach((r) => rows.push({ kind: 'join', refId: currentIP.id, meta: 'IP 참여 신청', applicant: { ...r, role: 'IP 참여 신청' }, at: r.requestedAt }));

  if (rows.length === 0) {
    alertEl.style.display = 'none';
    listEl.innerHTML = '';
    return;
  }
  alertEl.style.display = '';

  listEl.innerHTML = rows
    .map(
      ({ kind, refId, meta, applicant, at }) => `
      <div class="md-applicant-item">
        <div class="md-applicant-row">
          <button type="button" class="md-applicant-name">${bearipEscapeHtml(applicant.name)}</button>
          <span class="md-applicant-meta">${bearipEscapeHtml(meta)} · ${mdFormatApplicantTime(at)}</span>
          <span class="md-applicant-actions">
            <button type="button" class="md-applicant-accept" data-kind="${kind}" data-ref-id="${bearipEscapeAttr(refId)}" data-app-id="${bearipEscapeAttr(applicant.id)}">승낙</button>
            <button type="button" class="md-applicant-reject" data-kind="${kind}" data-ref-id="${bearipEscapeAttr(refId)}" data-app-id="${bearipEscapeAttr(applicant.id)}">거절</button>
          </span>
        </div>
        <div class="md-applicant-detail" style="display:none">
          <div class="md-applicant-detail-role">${bearipEscapeHtml(applicant.role || '역할 미지정')}</div>
          <div class="md-applicant-detail-bio">${bearipEscapeHtml(applicant.bio || '아직 작성된 소개가 없어요.')}</div>
          ${
            typeof bearipRenderApplicantPortfolioHtml === 'function' && bearipRenderApplicantPortfolioHtml(applicant, 'md-applicant')
              ? bearipRenderApplicantPortfolioHtml(applicant, 'md-applicant')
              : '<div class="md-applicant-detail-portfolio">공개된 포트폴리오가 없어요.</div>'
          }
          ${applicant.message ? `<div class="md-applicant-detail-message">"${bearipEscapeHtml(applicant.message)}"</div>` : ''}
        </div>
      </div>
    `
    )
    .join('');

  listEl.querySelectorAll('.md-applicant-name').forEach((btn) => {
    btn.addEventListener('click', () => {
      const detail = btn.closest('.md-applicant-item').querySelector('.md-applicant-detail');
      if (!detail) return;
      detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
    });
  });

  listEl.querySelectorAll('.md-applicant-accept, .md-applicant-reject').forEach((btn) => {
    btn.addEventListener('click', () => {
      const accepting = btn.classList.contains('md-applicant-accept');
      const decide = btn.dataset.kind === 'join' ? bearipDecideJoinRequest : bearipDecideApplicant;
      const updated = decide(btn.dataset.refId, btn.dataset.appId, accepting);
      if (!updated) return;
      bearipShowToast(accepting ? '지원자를 수락했어요' : '지원자를 거절했어요');
      mdRenderApplicantsAlert();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  mdRenderApplicantsAlert();
  if (typeof bearipOnDataChange === 'function') {
    bearipOnDataChange('positions', mdRenderApplicantsAlert);
    bearipOnDataChange('positionApplicants', mdRenderApplicantsAlert);
    bearipOnDataChange('ipJoinRequests', mdRenderApplicantsAlert);
  }
});
