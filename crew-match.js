// Apply / propose buttons — persisted so state survives reload and feeds
// the real "나의 매치 현황" summary (see crew-match-status.js).

const CM_APPLY_KEY = 'bearip_applied_positions';
const CM_PROPOSE_KEY = 'bearip_proposed_creators';

function cmSetApplyUI(btn, applied) {
  btn.textContent = applied ? '지원 완료' : '지원하기';
  btn.disabled = applied;
  btn.style.opacity = applied ? '0.6' : '';
}

function cmSetProposeUI(btn, proposed) {
  btn.textContent = proposed ? '제안 완료' : '매치 제안';
  btn.disabled = proposed;
  btn.style.opacity = proposed ? '0.6' : '';
}

document.querySelectorAll('.cm-apply-btn').forEach((btn) => {
  const card = btn.closest('.cm-position-card');
  const posId = card ? card.dataset.posId : null;

  if (posId) cmSetApplyUI(btn, bearipSetHas(CM_APPLY_KEY, posId));

  btn.addEventListener('click', () => {
    if (!bearipRequireLogin('crew-match.html')) return;
    const role = card ? card.querySelector('.cm-position-role').textContent : '포지션';
    const ipTitle = card ? card.querySelector('.cm-position-ip').textContent : '';

    if (posId) {
      const applied = bearipSetToggle(CM_APPLY_KEY, posId);
      cmSetApplyUI(btn, applied);
      if (!applied) return; // toggled back off — no notification
    } else {
      cmSetApplyUI(btn, true);
    }

    bearipAddNotification({
      type: 'crew',
      title: '포지션에 지원했어요',
      message: `${ipTitle ? ipTitle + ' · ' : ''}${role}에 지원했어요. 결과를 기다려주세요.`,
      link: 'profile.html',
    });
    if (typeof cmRenderMatchStatus === 'function') cmRenderMatchStatus();
  });
});

document.querySelectorAll('.cm-propose-btn').forEach((btn) => {
  const card = btn.closest('.cm-creator-card');
  const name = card ? card.querySelector('.cm-creator-name').textContent : null;

  if (name) cmSetProposeUI(btn, bearipSetHas(CM_PROPOSE_KEY, name));

  btn.addEventListener('click', () => {
    if (!bearipRequireLogin('crew-match.html')) return;

    if (name) {
      const proposed = bearipSetToggle(CM_PROPOSE_KEY, name);
      cmSetProposeUI(btn, proposed);
      if (!proposed) return;
    } else {
      cmSetProposeUI(btn, true);
    }

    bearipAddNotification({
      type: 'crew',
      title: '매치를 제안했어요',
      message: `${name || '크리에이터'}님에게 매치를 제안했어요. 수락하면 알려드릴게요.`,
      link: 'profile.html',
    });
    if (typeof cmRenderMatchStatus === 'function') cmRenderMatchStatus();
  });
});
