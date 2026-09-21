// "모집글 올리기" — CREW MATCH recruiting post creation flow, plus the card
// list every visitor browses. Postings/applicants live in Firebase (see
// storage.js), so cards here can belong to other people: only the posting's
// owner sees 지원자 확인 and accept/reject; everyone else just gets 지원하기.
// Anything user-typed is escaped since it now reaches other people's pages.

const CM_THUMBS = ['thumb-1', 'thumb-2', 'thumb-3', 'thumb-4', 'thumb-5', 'thumb-6', 'thumb-7', 'thumb-8'];

function cmPopulateIpSelect() {
  const select = document.getElementById('postIp');
  const savedIps = typeof bearipLoadIPs === 'function' ? bearipLoadIPs() : [];
  select.innerHTML = savedIps.length
    ? savedIps.map((ip) => `<option value="${bearipEscapeAttr(ip.id)}">${bearipEscapeHtml(ip.title)}</option>`).join('')
    : '<option value="">먼저 MY DNA에서 IP를 만들어주세요</option>';
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

// Resolves the IP behind a project title (positions only store ipTitle, not
// an id — same lookup convention as my-dna-applicants.js). Your own IPs first,
// then published ones, since a posting on CREW MATCH is often someone else's.
function cmResolveIpByTitle(ipTitle) {
  const own = typeof bearipLoadIPs === 'function' ? bearipLoadIPs() : [];
  const pub = typeof bearipLoadBrowsableIPs === 'function' ? bearipLoadBrowsableIPs() : [];
  const ip = own.find((i) => i.title === ipTitle) || pub.find((i) => i.title === ipTitle);
  if (ip) {
    bearipEnsureDnaBreakdown(ip);
    return ip;
  }
  return null;
}

function cmResolveIpForPosition(pos) {
  return cmResolveIpByTitle(pos.ipTitle);
}

// One delegated listener covers every DNA badge on the browse list without
// needing to wire each card individually.
const cmPositionsListEl = document.getElementById('positionsList');
if (cmPositionsListEl) {
  cmPositionsListEl.addEventListener('click', (e) => {
    const badge = e.target.closest('.cm-position-dna');
    if (!badge) return;
    const card = badge.closest('.cm-position-card');
    const ipTitle = card ? card.dataset.ipTitle : null;
    if (!ipTitle) return;
    const resolved = cmResolveIpByTitle(ipTitle);
    if (!resolved) return;
    odOpenDnaReport(ipTitle, resolved.dnaBreakdown, resolved.dnaScore);
  });
}

// Renders the 지원자 확인 list for a posting the current user owns —
// pending applicants get 승낙/거절 buttons, decided ones show a status badge.
// A DNA 현황 badge up top gives the reviewer the project's current
// completeness while they go through applicants (reuses OPEN DNA's
// read-only report popup, since open-dna.js is loaded on this page too).
function cmRenderApplicantsPanel(pos, panelEl, fracEl) {
  const applicants = bearipGetApplicants(pos.id);
  const projectIp = cmResolveIpForPosition(pos);
  const dnaHtml = projectIp
    ? `<button type="button" class="cm-applicants-dna">
         <span class="lbl">${bearipEscapeHtml(pos.ipTitle)} DNA 현황</span>
         <span class="val">${projectIp.dnaScore}%</span>
         <span class="tier">${bearipDnaScoreTier(projectIp.dnaScore)}</span>
       </button>`
    : '';

  if (!applicants.length) {
    panelEl.innerHTML = dnaHtml + '<div class="cm-applicants-empty">아직 지원자가 없어요.</div>';
    const emptyDnaBtn = panelEl.querySelector('.cm-applicants-dna');
    if (emptyDnaBtn) emptyDnaBtn.addEventListener('click', () => odOpenDnaReport(pos.ipTitle, projectIp.dnaBreakdown, projectIp.dnaScore));
    return;
  }
  panelEl.innerHTML = dnaHtml + applicants
    .map((a) => {
      const actions =
        a.status === 'pending'
          ? `<button type="button" class="cm-applicant-accept" data-app-id="${bearipEscapeAttr(a.id)}">승낙</button>
             <button type="button" class="cm-applicant-reject" data-app-id="${bearipEscapeAttr(a.id)}">거절</button>`
          : `<span class="s ${bearipEscapeAttr(a.status)}">${CM_APPLICANT_STATUS_LABEL[a.status] || bearipEscapeHtml(a.status)}</span>`;
      return `
        <div class="cm-applicant-item">
          <div class="cm-applicant-row">
            <button type="button" class="cm-applicant-name">${bearipEscapeHtml(a.name)}</button>
            <span class="cm-applicant-time">${cmFormatRelativeTime(a.appliedAt)}</span>
            <span class="cm-applicant-actions">${actions}</span>
          </div>
          <div class="cm-applicant-detail" hidden>
            <div class="cm-applicant-detail-role">${bearipEscapeHtml(a.role || '역할 미지정')}</div>
            <div class="cm-applicant-detail-bio">${bearipEscapeHtml(a.bio || '아직 작성된 소개가 없어요.')}</div>
            ${a.portfolioCount ? `<div class="cm-applicant-detail-portfolio">포트폴리오 ${a.portfolioCount}개</div>` : ''}
            ${a.message ? `<div class="cm-applicant-detail-message">"${bearipEscapeHtml(a.message)}"</div>` : ''}
          </div>
        </div>
      `;
    })
    .join('');

  const dnaBtn = panelEl.querySelector('.cm-applicants-dna');
  if (dnaBtn && projectIp) {
    dnaBtn.addEventListener('click', () => odOpenDnaReport(pos.ipTitle, projectIp.dnaBreakdown, projectIp.dnaScore));
  }

  panelEl.querySelectorAll('.cm-applicant-name').forEach((nameBtn) => {
    nameBtn.addEventListener('click', () => {
      const detail = nameBtn.closest('.cm-applicant-item').querySelector('.cm-applicant-detail');
      if (detail) detail.hidden = !detail.hidden;
    });
  });

  panelEl.querySelectorAll('.cm-applicant-accept, .cm-applicant-reject').forEach((btn) => {
    btn.addEventListener('click', () => {
      const accepting = btn.classList.contains('cm-applicant-accept');
      const updated = bearipDecideApplicant(pos.id, btn.dataset.appId, accepting);
      if (!updated) return;
      const current = bearipLoadPositions().find((p) => p.id === pos.id) || pos;
      if (fracEl) fracEl.textContent = `${current.filled || 0}/${current.count}`;
      bearipShowToast(accepting ? '지원자를 수락했어요' : '지원자를 거절했어요');
      cmRenderApplicantsPanel(current, panelEl, fracEl);
    });
  });
}

function cmRenderPositionCard(pos) {
  const esc = bearipEscapeHtml;
  const me = bearipGetUser();
  const isOwner = !!(me && pos.ownerNickname === me.nickname);

  const el = document.createElement('article');
  el.className = 'cm-position-card';
  el.dataset.role = cmGuessRole(pos.tags);
  el.dataset.deadline = '99-99'; // sorts after dated posts under "마감 임박순"
  el.dataset.remaining = String(pos.count - (pos.filled || 0));
  el.dataset.posId = pos.id;
  el.dataset.ipTitle = pos.ipTitle;
  const tagsHtml = (pos.tags || []).map((t) => `<span>${esc(t)}</span>`).join('');
  const filled = pos.filled || 0;
  const applicantCount = bearipGetApplicants(pos.id).length;
  const cardIp = cmResolveIpForPosition(pos);
  const dnaBadgeHtml = cardIp
    ? `<button type="button" class="cm-position-dna"><span class="lbl">DNA</span><span class="val">${cardIp.dnaScore}%</span></button>`
    : '';
  el.innerHTML = `
    <div class="cm-position-row">
      <div class="cm-position-thumb ${bearipEscapeAttr(pos.thumb || 'thumb-1')}"></div>
      <div class="cm-position-info">
        <div class="cm-position-ip">${esc(pos.ipTitle)}</div>
        <div class="cm-position-role">${esc(pos.role)} 모집</div>
        <div class="cm-position-tags">${tagsHtml}</div>
        ${dnaBadgeHtml}
      </div>
      <div class="cm-position-meta"><div class="frac">${filled}/${pos.count}</div><div class="deadline">${esc(pos.deadlineText || '')}</div></div>
      <button class="cm-apply-btn">지원하기</button>
    </div>
    ${isOwner ? `<button type="button" class="cm-applicants-toggle">지원자 확인 (${applicantCount})</button>
    <div class="cm-applicants-panel"></div>` : ''}
  `;

  const applyBtn = el.querySelector('.cm-apply-btn');
  const fracEl = el.querySelector('.cm-position-meta .frac');
  cmSetApplyUI(applyBtn, pos);
  applyBtn.addEventListener('click', () => {
    if (!bearipRequireLogin('crew-match.html')) return;
    const state = bearipApplyButtonState(pos);

    if (state.kind === 'pending') {
      // Un-applying is immediate — nothing to confirm on the way out.
      const user = bearipGetUser();
      if (user) bearipRemoveApplicantByName(pos.id, user.nickname);
      bearipShowToast('지원을 취소했어요');
      cmRefreshApplicantViews();
      if (typeof cmRenderMatchStatus === 'function') cmRenderMatchStatus();
      return;
    }
    if (state.kind !== 'none') return;

    odOpenApplyForm(`'${pos.ipTitle}' · ${pos.role}`, (message) => {
      bearipApplyToPosition(pos, message);
      cmRefreshApplicantViews();
      if (typeof cmRenderMatchStatus === 'function') cmRenderMatchStatus();
    });
  });

  // Not the `hidden` attribute — .cm-applicants-panel sets display:flex at
  // equal specificity to the UA [hidden] rule and would win, leaving the
  // panel visibly open. style.display is set directly instead.
  const applicantsToggle = el.querySelector('.cm-applicants-toggle');
  const applicantsPanel = el.querySelector('.cm-applicants-panel');
  if (applicantsToggle) {
    applicantsPanel.style.display = 'none';
    applicantsToggle.addEventListener('click', () => {
      const opening = applicantsPanel.style.display === 'none';
      if (opening) cmRenderApplicantsPanel(pos, applicantsPanel, fracEl);
      applicantsPanel.style.display = opening ? 'flex' : 'none';
    });
  }

  return el;
}

// Full rebuild of the browse list — runs on load and whenever the posting
// list (or the published IPs a card's DNA badge is looked up from) changes.
// Panels the owner had open stay open across the rebuild.
function cmRenderSavedPositions() {
  const list = document.getElementById('positionsList');
  if (!list) return;

  const openIds = [...list.querySelectorAll('.cm-position-card')]
    .filter((c) => {
      const panel = c.querySelector('.cm-applicants-panel');
      return panel && panel.style.display !== 'none';
    })
    .map((c) => c.dataset.posId);
  list.querySelectorAll('.cm-position-card').forEach((c) => c.remove());

  bearipLoadPositions()
    .slice()
    .reverse()
    .forEach((pos) => list.insertBefore(cmRenderPositionCard(pos), list.firstChild));

  openIds.forEach((id) => {
    const toggle = list.querySelector(`.cm-position-card[data-pos-id="${CSS.escape(id)}"] .cm-applicants-toggle`);
    if (toggle) toggle.click();
  });
  document.dispatchEvent(new CustomEvent('cm:positions-rendered'));
}

// In-place refresh when only applicant data changed (someone applied, the
// owner decided) — keeps open panels/scroll position instead of rebuilding.
function cmRefreshApplicantViews() {
  const positions = bearipLoadPositions();
  document.querySelectorAll('#positionsList .cm-position-card').forEach((card) => {
    const pos = positions.find((p) => p.id === card.dataset.posId);
    if (!pos) return;
    const applyBtn = card.querySelector('.cm-apply-btn');
    if (applyBtn) cmSetApplyUI(applyBtn, pos);
    const frac = card.querySelector('.cm-position-meta .frac');
    if (frac) frac.textContent = `${pos.filled || 0}/${pos.count}`;
    card.dataset.remaining = String(pos.count - (pos.filled || 0));
    const toggle = card.querySelector('.cm-applicants-toggle');
    if (toggle) {
      toggle.textContent = `지원자 확인 (${bearipGetApplicants(pos.id).length})`;
      const panel = card.querySelector('.cm-applicants-panel');
      if (panel && panel.style.display !== 'none') cmRenderApplicantsPanel(pos, panel, frac);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  cmPopulateIpSelect();
  cmRenderSavedPositions();
  if (typeof bearipOnDataChange === 'function') {
    bearipOnDataChange('positions', cmRenderSavedPositions);
    bearipOnDataChange('publicIPs', cmRenderSavedPositions);
    bearipOnDataChange('positionApplicants', cmRefreshApplicantViews);
  }

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
    // With no IP of your own the select only holds a "먼저 IP를 만들어주세요"
    // placeholder — posting would publish that sentence as the project title.
    if (!ipSelect.value) {
      bearipShowToast('먼저 MY DNA에서 IP를 만들어주세요');
      return;
    }
    const ipTitle = ipSelect.options[ipSelect.selectedIndex].text;
    const count = parseInt(document.getElementById('postCount').value, 10) || 1;
    const desc = document.getElementById('postDesc').value.trim();
    const deadlineRaw = document.getElementById('postDeadline').value;
    const deadlineText = deadlineRaw
      ? `~${deadlineRaw.slice(5, 7)}.${deadlineRaw.slice(8, 10)} 마감`
      : '상시 모집';
    const thumb = CM_THUMBS[Math.floor(Math.random() * CM_THUMBS.length)];

    const position = {
      id: 'pos_' + Date.now(),
      ipId: ipSelect.value,
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
    cmRenderSavedPositions();

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
