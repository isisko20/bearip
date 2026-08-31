// Renders "나의 매치 현황" from real, persisted state — not hardcoded
// numbers — so it reflects whatever the user has actually applied to,
// proposed, or joined (joined-IP state comes from ip-detail.js's key).

const CM_POSITION_LABELS = {
  'seoul-night-menders_visual-artist': { ip: '서울 야행수선단', role: 'Visual Artist' },
  'seoul-night-menders_bg-concept': { ip: '서울 야행수선단', role: '배경 컨셉 아티스트' },
  'cat-detective-momo_story-writer': { ip: '고양이 탐정 모모', role: 'Story Writer' },
  'memory-walking-girl_video-creator': { ip: '기억을 걷는 소녀', role: 'Video Creator' },
  'star-tower_bg-concept': { ip: '별을 품은 탑', role: '배경 컨셉 아티스트' },
  'ocean-planet_lettering': { ip: 'OCEAN PLANET', role: '레터링 스페셜리스트' },
};

function cmPositionLabel(id) {
  if (CM_POSITION_LABELS[id]) return CM_POSITION_LABELS[id];
  const posted = (typeof bearipLoadPositions === 'function' ? bearipLoadPositions() : []).find((p) => p.id === id);
  return posted ? { ip: posted.ipTitle, role: posted.role } : null;
}

function cmRenderMatchStatus() {
  const applied = bearipSetList('bearip_applied_positions');
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
  rowsEl.innerHTML = applied
    .map((id) => {
      const label = cmPositionLabel(id);
      const text = label ? `${bearipEscapeHtml(label.ip)} · ${bearipEscapeHtml(label.role)}` : bearipEscapeHtml(id);
      return `<div class="cm-applied-row"><span class="t">${text}</span><span class="cm-applied-right"><span class="s pending">검토 중</span><button type="button" class="cm-applied-cancel" data-pos-id="${bearipEscapeHtml(id)}">지원 취소</button></span></div>`;
    })
    .join('');
}

document.addEventListener('DOMContentLoaded', () => {
  cmRenderMatchStatus();

  document.getElementById('cmAppliedRows').addEventListener('click', (e) => {
    const btn = e.target.closest('.cm-applied-cancel');
    if (!btn) return;
    const posId = btn.dataset.posId;
    bearipSetToggle('bearip_applied_positions', posId);
    bearipShowToast('지원을 취소했어요');
    // Keep any currently-rendered apply button for this position in sync.
    const otherBtn = document.querySelector(`[data-pos-id="${CSS.escape(posId)}"] .cm-apply-btn`);
    if (otherBtn && typeof cmSetApplyUI === 'function') cmSetApplyUI(otherBtn, false);
    cmRenderMatchStatus();
  });
});
