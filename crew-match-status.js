// Renders "나의 매치 현황" from real, persisted state — not hardcoded
// numbers — so it reflects whatever the user has actually applied to,
// proposed, or joined (joined-IP state comes from ip-detail.js's key). Applied
// postings come from the shared applicant records (Firebase), so this matches
// what the owner sees and decides on, on any device.

function cmPositionLabel(id) {
  const posted = (typeof bearipLoadPositions === 'function' ? bearipLoadPositions() : []).find((p) => p.id === id);
  return posted ? { ip: posted.ipTitle, role: posted.role } : null;
}

function cmRenderMatchStatus() {
  const applied = bearipMyAppliedPositionIds();
  const proposed = bearipSetList('bearip_proposed_creators');
  const joined = bearipSetList('bearip_joined_ips');

  document.getElementById('cmStatApplied').textContent = applied.length;
  document.getElementById('cmStatProposed').textContent = proposed.length;
  document.getElementById('cmStatJoined').textContent = joined.length;

  const rowsEl = document.getElementById('cmAppliedRows');
  if (applied.length === 0) {
    rowsEl.innerHTML = '<div class="cm-applied-empty">아직 지원한 포지션이 없어요. 위 목록에서 지원해보세요.</div>';
    return;
  }
  const statusLabel = typeof CM_APPLICANT_STATUS_LABEL === 'object' ? CM_APPLICANT_STATUS_LABEL : { pending: '검토 중', accepted: '수락됨', rejected: '거절됨' };
  rowsEl.innerHTML = applied
    .map((id) => {
      const label = cmPositionLabel(id);
      const text = label ? `${bearipEscapeHtml(label.ip)} · ${bearipEscapeHtml(label.role)}` : bearipEscapeHtml(id);
      const mine = bearipMyApplication(id);
      const status = mine ? mine.status : 'pending';
      const cancelBtn = status === 'pending'
        ? `<button type="button" class="cm-applied-cancel" data-pos-id="${bearipEscapeAttr(id)}">지원 취소</button>`
        : '';
      return `<div class="cm-applied-row"><span class="t">${text}</span><span class="cm-applied-right"><span class="s ${bearipEscapeAttr(status)}">${statusLabel[status]}</span>${cancelBtn}</span></div>`;
    })
    .join('');
}

document.addEventListener('DOMContentLoaded', () => {
  cmRenderMatchStatus();
  if (typeof bearipOnDataChange === 'function') {
    bearipOnDataChange('positions', cmRenderMatchStatus);
    bearipOnDataChange('positionApplicants', cmRenderMatchStatus);
  }

  document.getElementById('cmAppliedRows').addEventListener('click', (e) => {
    const btn = e.target.closest('.cm-applied-cancel');
    if (!btn) return;
    const user = typeof bearipGetUser === 'function' ? bearipGetUser() : null;
    if (user) bearipRemoveApplicantByName(btn.dataset.posId, user.nickname);
    bearipShowToast('지원을 취소했어요');

    // Keep any currently-rendered position card for this posting in sync —
    // its own apply button, applicant count badge, and (if open) its
    // applicants panel would otherwise still show the retracted application.
    if (typeof cmRefreshApplicantViews === 'function') cmRefreshApplicantViews();
    cmRenderMatchStatus();
  });
});
