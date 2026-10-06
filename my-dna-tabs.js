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

// ASSETS tab: filter chips (character / world / story / art) — combined
// with whichever folder is selected via applyAssetFilters (my-dna-render.js).
document.querySelectorAll('.md-asset-filter-row .md-pill-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.md-asset-filter-row .md-pill-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    if (typeof applyAssetFilters === 'function') applyAssetFilters();
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
      // 매뉴얼이 세계관·스토리를 다루므로 이 두 카드만 AI 시나리오 도움으로 연결해요.
      // 레터링처럼 매뉴얼에 없는 항목은 솔직하게 준비 중이라고 알려줘요.
      const needCard = btn.closest('.md-need-card');
      const type = needCard ? needCard.dataset.assetType : '';
      if (type === 'world' || type === 'story') {
        bearipOpenAiAssist({ preset: type });
      } else {
        bearipShowToast('이 항목의 AI 도움은 아직 준비 중이에요');
      }
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
