// Shared by crew-match-post.js's cmRenderPositionCard and
// crew-match-status.js — kept here since this file loads first among the
// four crew-match-*.js files (script tag order in crew-match.html). The
// label/enabled state comes from the user's real application record (owner
// accept/reject included), not a local "did I click it" flag.
function cmSetApplyUI(btn, pos) {
  const state = bearipApplyButtonState(pos);
  btn.textContent = state.label;
  btn.disabled = state.disabled;
  btn.classList.toggle('applied', state.kind === 'pending');
  btn.classList.toggle('is-final', state.kind === 'accepted' || state.kind === 'rejected' || state.kind === 'owner');
}

// "크리에이터 둘러보기" — real creator cards, sourced from Firebase's
// publicCreators (storage.js's bearipSyncMyCreatorProfile), not static demo
// markup. profile.html's "가능한 포지션" tab promises that saving it makes you
// findable here; this is the render side of that promise. Mirrors
// crew-match-post.js's cmRenderPositionCard — per-card listeners wired at
// creation time, not a page-load-time querySelectorAll (a card that doesn't
// exist yet when a script parses can never pick up such a listener).

const CM_PROPOSE_KEY = 'bearip_proposed_creators';

function cmSetProposeUI(btn, proposed) {
  btn.textContent = proposed ? '제안 취소' : '매치 제안';
  btn.classList.toggle('proposed', proposed);
}

function cmRenderCreatorCard(creator, index) {
  const esc = typeof bearipEscapeHtml === 'function' ? bearipEscapeHtml : (s) => s;
  const el = document.createElement('article');
  el.className = 'cm-creator-card';
  el.dataset.role = typeof cmGuessRole === 'function' ? cmGuessRole(creator.positions) : 'other';
  el.dataset.nickname = creator.nickname;

  const avatarThumb = `thumb-${(index % 8) + 1}`;
  const roleText = (creator.positions || []).join(', ') || '포지션 미지정';
  const portfolio = (creator.portfolio || []).slice(0, 3);
  const portfolioHtml = portfolio.length
    ? `<div class="cm-creator-portfolio">${portfolio.map((p) => `<div class="${esc(p.thumb || 'thumb-1')}" title="${esc(p.title || '')}"></div>`).join('')}</div>`
    : '';

  el.innerHTML = `
    <div class="cm-creator-top">
      <div class="cm-creator-avatar ${avatarThumb}"></div>
      <div>
        <div class="cm-creator-name">${esc(creator.nickname)}</div>
        <div class="cm-creator-role">${esc(roleText)}</div>
      </div>
    </div>
    <div class="cm-creator-bio">${esc(creator.bio) || '아직 소개가 없어요.'}</div>
    ${portfolioHtml}
    <div class="cm-creator-foot">
      <span class="cm-creator-followers">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.5-9.5-9C.6 8.5 3 4.5 7 4.5c2.1 0 3.7 1.2 5 3 1.3-1.8 2.9-3 5-3 4 0 6.4 4 4.5 7.5C19 16.5 12 21 12 21z"/></svg>
        <span>응원 ${typeof bearipFormatCount === 'function' ? bearipFormatCount(creator.cheers || 0) : creator.cheers || 0}</span>
      </span>
      <button type="button" class="cm-propose-btn">매치 제안</button>
    </div>
  `;

  const proposeBtn = el.querySelector('.cm-propose-btn');
  cmSetProposeUI(proposeBtn, bearipSetHas(CM_PROPOSE_KEY, creator.nickname));
  proposeBtn.addEventListener('click', () => {
    if (!bearipRequireLogin('crew-match.html')) return;

    const proposed = bearipSetToggle(CM_PROPOSE_KEY, creator.nickname);
    cmSetProposeUI(proposeBtn, proposed);
    if (!proposed) {
      bearipShowToast('제안을 취소했어요');
      if (typeof cmRenderMatchStatus === 'function') cmRenderMatchStatus();
      return;
    }

    const me = bearipGetUser();
    bearipAddNotification({
      type: 'crew',
      title: '매치를 제안했어요',
      message: `${creator.nickname}님에게 매치를 제안했어요. 수락하면 알려드릴게요.`,
      link: 'crew-match.html',
    });
    // The actual delivery — without this, "매치 제안" only ever talked to
    // yourself. profile.js's 받은 제안 stat counts notifications by this
    // exact title, so keep the two in sync if either one changes.
    bearipAddNotification(
      {
        type: 'crew',
        title: '매치 제안을 받았어요',
        message: `${me ? me.nickname : '누군가'}님이 함께 작업하고 싶어해요. 프로필에서 확인해보세요.`,
        link: 'profile.html',
      },
      creator.nickname
    );
    if (typeof cmRenderMatchStatus === 'function') cmRenderMatchStatus();
  });

  return el;
}

function cmRenderSavedCreators() {
  const container = document.querySelector('.cm-creators');
  const empty = document.getElementById('creatorsEmpty');
  if (!container || typeof bearipLoadPublicCreators !== 'function') return;

  container.querySelectorAll('.cm-creator-card[data-rendered="1"]').forEach((el) => el.remove());

  const me = typeof bearipGetUser === 'function' ? bearipGetUser() : null;
  const creators = bearipLoadPublicCreators().filter((c) => !me || c.nickname !== me.nickname);

  creators.forEach((creator, i) => {
    const card = cmRenderCreatorCard(creator, i);
    card.dataset.rendered = '1';
    container.appendChild(card);
  });

  if (empty) empty.hidden = creators.length > 0;
}

document.addEventListener('DOMContentLoaded', () => {
  cmRenderSavedCreators();
  if (typeof bearipOnDataChange === 'function') bearipOnDataChange('publicCreators', cmRenderSavedCreators);
});
