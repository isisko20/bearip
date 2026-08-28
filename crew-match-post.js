// "모집글 올리기" — CREW MATCH recruiting post creation flow.

const CM_DEMO_IP = { id: 'demo', title: '서울 야행수선단' };
const CM_THUMBS = ['thumb-1', 'thumb-2', 'thumb-3', 'thumb-4', 'thumb-5', 'thumb-6', 'thumb-7', 'thumb-8'];

function cmPopulateIpSelect() {
  const select = document.getElementById('postIp');
  const savedIps = typeof bearipLoadIPs === 'function' ? bearipLoadIPs() : [];
  const options = [CM_DEMO_IP, ...savedIps];
  select.innerHTML = options.map((ip) => `<option value="${ip.id}">${ip.title}</option>`).join('');
}

const CM_SKILL_TO_ROLE = {
  '스토리': 'story',
  '비주얼': 'visual',
  '배경/장소': 'visual',
  '컨셉아트': 'visual',
  '영상편집': 'video',
  '레터링': 'lettering',
};

function cmGuessRole(tags) {
  for (const tag of tags || []) {
    if (CM_SKILL_TO_ROLE[tag]) return CM_SKILL_TO_ROLE[tag];
  }
  return 'other';
}

function cmRenderPositionCard(pos) {
  const el = document.createElement('article');
  el.className = 'cm-position-card';
  el.dataset.role = cmGuessRole(pos.tags);
  el.dataset.deadline = '99-99'; // sorts after dated posts under "마감 임박순"
  el.dataset.remaining = String(pos.count - (pos.filled || 0));
  el.dataset.posId = pos.id;
  const tagsHtml = (pos.tags || []).map((t) => `<span>${t}</span>`).join('');
  const filled = pos.filled || 0;
  el.innerHTML = `
    <div class="cm-position-thumb ${pos.thumb}"></div>
    <div class="cm-position-info">
      <div class="cm-position-ip">${pos.ipTitle}</div>
      <div class="cm-position-role">${pos.role} 모집</div>
      <div class="cm-position-tags">${tagsHtml}</div>
    </div>
    <div class="cm-position-meta"><div class="frac">${filled}/${pos.count}</div><div class="deadline">${pos.deadlineText}</div></div>
    <button class="cm-apply-btn">지원하기</button>
  `;
  // Reuses crew-match.js's persistence + "나의 매치 현황" refresh so a
  // user-posted listing's apply button behaves exactly like a static one.
  const applyBtn = el.querySelector('.cm-apply-btn');
  cmSetApplyUI(applyBtn, bearipSetHas(CM_APPLY_KEY, pos.id));
  applyBtn.addEventListener('click', () => {
    if (!bearipRequireLogin('crew-match.html')) return;
    const applied = bearipSetToggle(CM_APPLY_KEY, pos.id);
    cmSetApplyUI(applyBtn, applied);
    if (!applied) return;
    bearipAddNotification({
      type: 'crew',
      title: '포지션에 지원했어요',
      message: `${pos.ipTitle} · ${pos.role}에 지원했어요. 결과를 기다려주세요.`,
      link: 'profile.html',
    });
    if (typeof cmRenderMatchStatus === 'function') cmRenderMatchStatus();
  });
  return el;
}

function cmRenderSavedPositions() {
  const list = document.getElementById('positionsList');
  const saved = typeof bearipLoadPositions === 'function' ? bearipLoadPositions() : [];
  saved
    .slice()
    .reverse()
    .forEach((pos) => list.insertBefore(cmRenderPositionCard(pos), list.firstChild));
}

document.addEventListener('DOMContentLoaded', () => {
  cmPopulateIpSelect();
  cmRenderSavedPositions();

  // Page tabs (포지션 둘러보기 / 모집글 올리기) — posting requires login
  document.querySelectorAll('#cmPageTabs .od-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.pageTab;
      if (target === 'post' && !bearipRequireLogin('crew-match.html')) return;
      document.querySelectorAll('.cm-page-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.dataset.pagePanel === target);
      });
    });
  });

  // Skill chips (max 3)
  let selectedSkills = [];
  document.querySelectorAll('.cm-skill-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const skill = chip.dataset.skill;
      if (chip.classList.contains('active')) {
        chip.classList.remove('active');
        selectedSkills = selectedSkills.filter((s) => s !== skill);
      } else {
        if (selectedSkills.length >= 3) return;
        chip.classList.add('active');
        selectedSkills.push(skill);
      }
    });
  });

  const goToBrowseTab = () => {
    const browseTab = document.querySelector('#cmPageTabs [data-page-tab="browse"]');
    if (browseTab) browseTab.click();
  };

  document.getElementById('postCancelBtn').addEventListener('click', goToBrowseTab);

  document.getElementById('postSubmitBtn').addEventListener('click', () => {
    const roleInput = document.getElementById('postRole');
    const role = roleInput.value.trim();
    const errorEl = document.getElementById('postRoleError');

    if (!role) {
      errorEl.classList.add('show');
      roleInput.classList.add('error');
      roleInput.focus();
      return;
    }
    errorEl.classList.remove('show');
    roleInput.classList.remove('error');

    const ipSelect = document.getElementById('postIp');
    const ipTitle = ipSelect.options[ipSelect.selectedIndex]
      ? ipSelect.options[ipSelect.selectedIndex].text
      : '내 IP';
    const count = parseInt(document.getElementById('postCount').value, 10) || 1;
    const desc = document.getElementById('postDesc').value.trim();
    const deadlineRaw = document.getElementById('postDeadline').value;
    const deadlineText = deadlineRaw
      ? `~${deadlineRaw.slice(5, 7)}.${deadlineRaw.slice(8, 10)} 마감`
      : '상시 모집';
    const thumb = CM_THUMBS[Math.floor(Math.random() * CM_THUMBS.length)];

    const position = {
      id: 'pos_' + Date.now(),
      ipTitle,
      role,
      count,
      filled: 0,
      tags: selectedSkills.slice(),
      desc,
      deadlineText,
      thumb,
      createdAt: new Date().toISOString(),
    };

    bearipAddPosition(position);
    bearipAddNotification({
      type: 'crew',
      title: '모집글이 등록됐어요',
      message: `'${position.ipTitle}'의 '${position.role}' 포지션 모집글이 등록됐어요.`,
      link: 'crew-match.html',
    });
    const list = document.getElementById('positionsList');
    list.insertBefore(cmRenderPositionCard(position), list.firstChild);

    // reset form
    roleInput.value = '';
    document.getElementById('postCount').value = 1;
    document.getElementById('postDesc').value = '';
    document.getElementById('postDeadline').value = '';
    document.querySelectorAll('.cm-skill-chip.active').forEach((c) => c.classList.remove('active'));
    selectedSkills = [];

    goToBrowseTab();
    const successEl = document.getElementById('postSuccess');
    successEl.classList.add('show');
    setTimeout(() => successEl.classList.remove('show'), 4000);
  });
});
