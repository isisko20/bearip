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
