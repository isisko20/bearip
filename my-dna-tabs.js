// Top-level MY DNA tabs: 개요 / ASSETS / DISCUSSION
document.querySelectorAll('#mdTabs .md-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tabTarget;
    document.querySelectorAll('#mdTabs .md-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.md-tab-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.dataset.tabPanel === target);
    });
  });
});

// ASSETS tab: filter chips (character / world / story / art)
document.querySelectorAll('.md-asset-filter-row .md-pill-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.md-asset-filter-row .md-pill-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const type = btn.dataset.assetType;
    document.querySelectorAll('#assetsRow .md-asset-card').forEach((card) => {
      card.style.display = type === 'all' || card.dataset.type === type ? '' : 'none';
    });
  });
});

// "목표 변경 시 달라지는 점" rows: clicking one actually switches the goal
// (reuses the real 목표 선택 buttons so every dependent render stays in sync).
document.querySelectorAll('.md-change-row[data-switch-goal]').forEach((row) => {
  row.style.cursor = 'pointer';
  row.addEventListener('click', () => {
    const goalBtn = document.querySelector(`.md-goal[data-goal="${row.dataset.switchGoal}"]`);
    if (goalBtn) {
      goalBtn.click();
      goalBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
});

// "추가로 필요한 것" action pills.
document.querySelectorAll('.md-need-actions .md-pill-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.classList.contains('creator')) {
      // Set the role filter before the login check — bearipRequireLogin may
      // redirect to login.html, and the intent needs to survive that trip.
      if (btn.dataset.role) sessionStorage.setItem('bearip_cm_role_filter', btn.dataset.role);
      if (!bearipRequireLogin('crew-match.html')) return;
      location.href = 'crew-match.html';
      return;
    }
    const label = btn.classList.contains('ai') ? 'AI와 만들기' : '직접 작업하기';
    bearipShowToast(`${label} 기능은 아직 준비 중이에요`);
  });
});
