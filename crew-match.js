// Lightweight click feedback for apply / propose buttons (no backend yet).
document.querySelectorAll('.cm-apply-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (!bearipRequireLogin('crew-match.html')) return;
    const card = btn.closest('.cm-position-card');
    const role = card ? card.querySelector('.cm-position-role').textContent : '포지션';
    const ipTitle = card ? card.querySelector('.cm-position-ip').textContent : '';
    bearipAddNotification({
      type: 'crew',
      title: '포지션에 지원했어요',
      message: `${ipTitle ? ipTitle + ' · ' : ''}${role}에 지원했어요. 결과를 기다려주세요.`,
      link: 'profile.html',
    });
    btn.textContent = '지원 완료';
    btn.disabled = true;
    btn.style.opacity = '0.6';
  });
});

document.querySelectorAll('.cm-propose-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (!bearipRequireLogin('crew-match.html')) return;
    const card = btn.closest('.cm-creator-card');
    const name = card ? card.querySelector('.cm-creator-name').textContent : '크리에이터';
    bearipAddNotification({
      type: 'crew',
      title: '매치를 제안했어요',
      message: `${name}님에게 매치를 제안했어요. 수락하면 알려드릴게요.`,
      link: 'profile.html',
    });
    btn.textContent = '제안 완료';
    btn.disabled = true;
    btn.style.opacity = '0.6';
  });
});
