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

const CM_APPLICANT_STATUS_LABEL = { pending: '검토 중', accepted: '수락됨', rejected: '거절됨' };

function cmFormatRelativeTime(iso) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

// Renders the 지원자 확인 list for a posting the current user owns —
// pending applicants get 승낙/거절 buttons, decided ones show a status badge.
function cmRenderApplicantsPanel(pos, panelEl, fracEl) {
  const applicants = bearipSeedApplicantsIfEmpty(pos.id);
  if (!applicants.length) {
    panelEl.innerHTML = '<div class="cm-applicants-empty">아직 지원자가 없어요.</div>';
    return;
  }
  panelEl.innerHTML = applicants
    .map((a) => {
      const actions =
        a.status === 'pending'
          ? `<button type="button" class="cm-applicant-accept" data-app-id="${a.id}">승낙</button>
             <button type="button" class="cm-applicant-reject" data-app-id="${a.id}">거절</button>`
          : `<span class="s ${a.status}">${CM_APPLICANT_STATUS_LABEL[a.status]}</span>`;
      return `
        <div class="cm-applicant-item">
          <div class="cm-applicant-row">
            <button type="button" class="cm-applicant-name" data-info-id="${a.id}">${bearipEscapeHtml(a.name)}</button>
            <span class="cm-applicant-time">${cmFormatRelativeTime(a.appliedAt)}</span>
            <span class="cm-applicant-actions">${actions}</span>
          </div>
          <div class="cm-applicant-detail" id="applicant-detail-${a.id}" hidden>
            <div class="cm-applicant-detail-role">${bearipEscapeHtml(a.role || '역할 미지정')}</div>
            <div class="cm-applicant-detail-bio">${bearipEscapeHtml(a.bio || '아직 작성된 소개가 없어요.')}</div>
            ${a.portfolioCount ? `<div class="cm-applicant-detail-portfolio">포트폴리오 ${a.portfolioCount}개</div>` : ''}
          </div>
        </div>
      `;
    })
    .join('');

  panelEl.querySelectorAll('.cm-applicant-name').forEach((nameBtn) => {
    nameBtn.addEventListener('click', () => {
      const detail = document.getElementById(`applicant-detail-${nameBtn.dataset.infoId}`);
      if (detail) detail.hidden = !detail.hidden;
    });
  });

  panelEl.querySelectorAll('.cm-applicant-accept, .cm-applicant-reject').forEach((btn) => {
    btn.addEventListener('click', () => {
      const accepting = btn.classList.contains('cm-applicant-accept');
      const updated = bearipUpdateApplicantStatus(pos.id, btn.dataset.appId, accepting ? 'accepted' : 'rejected');
      if (!updated) return;
      if (accepting) {
        const newFilled = Math.min((pos.filled || 0) + 1, pos.count);
        const savedPos = bearipUpdatePosition(pos.id, { filled: newFilled });
        if (savedPos) {
          pos.filled = savedPos.filled;
          if (fracEl) fracEl.textContent = `${pos.filled}/${pos.count}`;
        }
      }
      bearipShowToast(accepting ? '지원자를 수락했어요' : '지원자를 거절했어요');
      cmRenderApplicantsPanel(pos, panelEl, fracEl);
    });
  });
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
  const applicantCount = bearipSeedApplicantsIfEmpty(pos.id).length;
  el.innerHTML = `
    <div class="cm-position-row">
      <div class="cm-position-thumb ${pos.thumb}"></div>
      <div class="cm-position-info">
        <div class="cm-position-ip">${pos.ipTitle}</div>
        <div class="cm-position-role">${pos.role} 모집</div>
        <div class="cm-position-tags">${tagsHtml}</div>
      </div>
      <div class="cm-position-meta"><div class="frac">${filled}/${pos.count}</div><div class="deadline">${pos.deadlineText}</div></div>
      <button class="cm-apply-btn">지원하기</button>
    </div>
    <button type="button" class="cm-applicants-toggle">지원자 확인 (${applicantCount})</button>
    <div class="cm-applicants-panel" hidden></div>
  `;
  // Reuses crew-match.js's persistence + "나의 매치 현황" refresh so a
  // user-posted listing's apply button behaves exactly like a static one.
  const applyBtn = el.querySelector('.cm-apply-btn');
  const fracEl = el.querySelector('.cm-position-meta .frac');
  cmSetApplyUI(applyBtn, bearipSetHas(CM_APPLY_KEY, pos.id));
  applyBtn.addEventListener('click', () => {
    if (!bearipRequireLogin('crew-match.html')) return;
    const applied = bearipSetToggle(CM_APPLY_KEY, pos.id);
    cmSetApplyUI(applyBtn, applied);
    const user = bearipGetUser();
    if (!applied) {
      if (user) bearipRemoveApplicantByName(pos.id, user.nickname);
      bearipShowToast('지원을 취소했어요');
      if (typeof cmRenderMatchStatus === 'function') cmRenderMatchStatus();
      return;
    }
    if (user) {
      const myPositions = typeof bearipGetMyPositions === 'function' ? bearipGetMyPositions() : [];
      const myPortfolio = typeof bearipLoadPortfolio === 'function' ? bearipLoadPortfolio() : [];
      bearipAddApplicant(pos.id, {
        id: 'app_me_' + pos.id,
        name: user.nickname,
        role: myPositions[0] || '',
        bio: user.bio || '',
        portfolioCount: myPortfolio.length,
        appliedAt: new Date().toISOString(),
        status: 'pending',
      });
    }
    const toggleBtn = el.querySelector('.cm-applicants-toggle');
    const panelEl = el.querySelector('.cm-applicants-panel');
    toggleBtn.textContent = `지원자 확인 (${bearipGetApplicants(pos.id).length})`;
    if (!panelEl.hidden) cmRenderApplicantsPanel(pos, panelEl, fracEl);
    bearipAddNotification({
      type: 'crew',
      title: '포지션에 지원했어요',
      message: `${pos.ipTitle} · ${pos.role}에 지원했어요. 결과를 기다려주세요.`,
      link: 'profile.html',
    });
    if (typeof cmRenderMatchStatus === 'function') cmRenderMatchStatus();
  });

  const applicantsToggle = el.querySelector('.cm-applicants-toggle');
  const applicantsPanel = el.querySelector('.cm-applicants-panel');
  applicantsToggle.addEventListener('click', () => {
    const opening = applicantsPanel.hidden;
    if (opening) cmRenderApplicantsPanel(pos, applicantsPanel, fracEl);
    applicantsPanel.hidden = !opening;
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
