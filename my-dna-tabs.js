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
    if (btn.classList.contains('ai')) {
      bearipShowToast('AI와 만들기 기능은 아직 준비 중이에요');
      return;
    }
    // "내가 직접" — jump to ASSETS and open the upload form, pre-filled with
    // this need's title so the resulting asset stays traceable to the need.
    const needCard = btn.closest('.md-need-card');
    const needTitle = needCard ? needCard.querySelector('.md-need-title').textContent.trim() : '';
    const assetsTab = document.querySelector('#mdTabs [data-tab-target="assets"]');
    if (assetsTab) assetsTab.click();
    const tile = document.getElementById('assetAddTile');
    if (tile && !tile.querySelector('.md-asset-add-form')) tile.click();
    const titleInput = document.getElementById('assetTitleInput');
    if (titleInput) titleInput.value = needTitle;
    const typeSelect = document.getElementById('assetTypeSelect');
    if (typeSelect && needCard && needCard.dataset.assetType) typeSelect.value = needCard.dataset.assetType;
    if (tile) tile.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
});
