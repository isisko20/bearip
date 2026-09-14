// Wires the IP detail hero/recruit action buttons: 참여하기, 팔로우, 지원하기.
// State is kept in localStorage (namespaced sets) so it survives reload.

const IPD_JOIN_KEY = 'bearip_joined_ips';
const IPD_FOLLOW_KEY = 'bearip_followed_ips';
const IPD_APPLY_KEY = 'bearip_applied_positions';

function ipdSetJoinedUI(btn, joined) {
  btn.textContent = joined ? '참여 신청 완료' : '참여하기';
  btn.disabled = joined;
  btn.classList.toggle('is-done', joined);
}

function ipdSetFollowUI(btn, following) {
  const label = btn.querySelector('.ipd-follow-label');
  label.textContent = following ? '팔로잉' : '팔로우';
  btn.classList.toggle('is-following', following);
}

function ipdSetApplyUI(btn, applied) {
  btn.textContent = applied ? '지원 취소' : '지원하기';
  btn.classList.toggle('is-done', applied);
}

const IPD_GOAL_LABELS = { webnovel: '웹소설', webtoon: '웹툰', video: '영상', multi: '멀티포맷' };

// Rewrites the static placeholder markup in place for a user-created IP, if
// the visitor arrived here via a "IP 보기 / 참여하기" click from OPEN DNA
// (open-dna-published.js sets this one-shot flag before navigating, with the
// FULL IP object — not just an id, since a publicly published IP may not
// exist in this visitor's own local storage at all). There's no real
// multi-user data for this prototype, so anything we can't honestly derive
// from the IP itself (crew roster, past updates, published episodes) is
// shown as an empty state instead of being left as fake demo content.
// Arriving with no snapshot at all (direct navigation) leaves the static
// placeholder in place.
function ipdApplyDynamicIP() {
  const raw = sessionStorage.getItem('bearip_view_ip_snapshot');
  sessionStorage.removeItem('bearip_view_ip_snapshot');
  if (!raw) return;
  let ip;
  try {
    ip = JSON.parse(raw);
  } catch (e) {
    return;
  }
  if (!ip || !ip.id) return;

  // CONTENT ROOM's cards and TOP 100 ranking read views/likes straight off
  // the IP, so — unlike the demo's follower/cheer numbers, which have
  // always been session-local only — this needs to actually persist. Only
  // meaningful (and only actually writable) for an IP that lives in this
  // visitor's own local storage — someone else's published IP has no local
  // copy to update here, so it's just left showing its already-known count.
  const isOwnIP = typeof bearipLoadIPs === 'function' && bearipLoadIPs().some((i) => i.id === ip.id);
  if (isOwnIP) {
    ip.views = (ip.views || 0) + 1;
    bearipUpdateIP(ip.id, { views: ip.views });
  }

  const esc = typeof bearipEscapeHtml === 'function' ? bearipEscapeHtml : (s) => s;
  const goalLabel = IPD_GOAL_LABELS[ip.goal] || '';

  document.title = `Thinkit — ${ip.title}`;
  document.getElementById('ipdHeroTitle').textContent = ip.title;
  document.getElementById('ipdHeroTagline').textContent = ip.logline || '아직 로그라인이 없어요.';
  document.getElementById('ipdHeroGenre').textContent = [...(ip.genres || []), goalLabel].filter(Boolean).join(' · ') || '미지정';

  const imageAsset = (ip.assets || []).find((a) => a.imageData);
  const coverUrl = ip.coverImage || (imageAsset && imageAsset.imageData);
  const heroBg = document.getElementById('ipdHeroBg');
  if (coverUrl) {
    heroBg.classList.remove('thumb-1');
    heroBg.style.backgroundImage = `url('${coverUrl}')`;
    heroBg.style.backgroundSize = 'cover';
    heroBg.style.backgroundPosition = 'center';
  } else {
    heroBg.className = `ipd-hero-bg thumb-${(ip.id.length % 8) + 1}`;
  }

  const stats = document.querySelectorAll('#ipdHeroStats .ipd-hero-stat');
  const setStat = (el, value) => {
    el.querySelector('.value').textContent = `${value}%`;
    el.querySelector('.bar-fill').style.width = `${value}%`;
  };
  setStat(stats[0], ip.dnaScore || 0);
  setStat(stats[1], ip.readinessScore || 0);
  setStat(stats[2], ip.productionProgress || 0);

  const joinBtn = document.getElementById('ipdJoinBtn');
  joinBtn.dataset.ip = ip.id;
  joinBtn.dataset.ipTitle = ip.title;
  const followBtn = document.getElementById('ipdFollowBtn');
  followBtn.dataset.ip = ip.id;
  followBtn.dataset.ipTitle = ip.title;

  // No real follower/activity tracking for user IPs yet — honest zeros
  // rather than carrying over the demo's fixed numbers. 좋아요 is real,
  // though: it's the same count CONTENT ROOM and TOP 100 read.
  document.getElementById('ipdFollowerCount').textContent = '0';
  document.getElementById('ipdActivityCount').textContent = '0';
  const cheerBtn = document.getElementById('ipdCheerBtn');
  cheerBtn.dataset.ip = ip.id;
  cheerBtn.dataset.ipTitle = ip.title;
  document.getElementById('ipdCheerCount').textContent = bearipFormatCount(ip.likes || 0);

  const descEl = document.querySelector('.ipd-panel p.desc');
  if (descEl) descEl.textContent = ip.synopsis || ip.logline || '아직 작성된 소개가 없어요.';

  const user = typeof bearipGetUser === 'function' ? bearipGetUser() : null;
  // ip.ownerNickname only exists on IPs published after this field was
  // added — for an IP that IS this viewer's own (isOwnIP), whoever's logged
  // in now IS the owner regardless; for someone else's older IP with no
  // recorded owner, fall back to a neutral label instead of misreporting
  // the current *viewer* as the owner.
  const ownerName = ip.ownerNickname || (isOwnIP && user ? user.nickname : null);
  const creatorsWrap = document.querySelector('.ipd-creators');
  if (creatorsWrap) {
    creatorsWrap.innerHTML = `
      <div class="ipd-creator-row">
        <div class="ipd-creator-avatar thumb-2"></div>
        <div class="ipd-creator-info"><div class="n">${esc(ownerName || '크리에이터')}</div><div class="r">오너</div></div>
        <span class="ipd-creator-badge">오너</span>
      </div>
      <div class="ipd-creators-empty">아직 합류한 크루가 없어요. CREW MATCH에서 모집해보세요.</div>
    `;
  }

  document.getElementById('ipdEpCount').textContent = '0';
  const epList = document.querySelector('.ipd-ep-list');
  if (epList) epList.innerHTML = '<div class="ipd-ep-empty">아직 등록된 회차가 없어요.</div>';

  const feed = document.querySelector('.ipd-feed');
  if (feed) {
    if (ip.createdAt) {
      const d = new Date(ip.createdAt);
      const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
      feed.innerHTML = `<div class="ipd-feed-item"><div class="ipd-feed-dot"></div><div class="ipd-feed-text"><div class="t">IP가 생성됐어요</div><div class="d">${dateStr}</div></div></div>`;
    } else {
      feed.innerHTML = '<div class="ipd-feed-empty">아직 업데이트가 없어요.</div>';
    }
  }

  const recruitPanel = document.querySelector('.ipd-recruit-row') ? document.querySelector('.ipd-recruit-row').closest('.ipd-panel') : null;
  if (recruitPanel) {
    recruitPanel.querySelectorAll('.ipd-recruit-row').forEach((row) => row.remove());
    const positions = (typeof bearipLoadPositions === 'function' ? bearipLoadPositions() : []).filter((p) => p.ipTitle === ip.title);
    if (positions.length === 0) {
      recruitPanel.insertAdjacentHTML('beforeend', '<div class="ipd-recruit-empty">아직 모집 중인 포지션이 없어요.</div>');
    } else {
      positions.forEach((pos) => {
        recruitPanel.insertAdjacentHTML(
          'beforeend',
          `<div class="ipd-recruit-row">
            <div class="ipd-recruit-info"><div class="r">${esc(pos.role)}</div><div class="f">${pos.filled || 0}/${pos.count} 참여</div></div>
            <button class="ipd-apply-btn" data-pos="${esc(pos.id)}" data-pos-title="${esc(pos.role)}" data-ip-title="${esc(ip.title)}">지원하기</button>
          </div>`
        );
      });
    }
  }

  const infoGenre = document.getElementById('ipdInfoGenre');
  if (infoGenre) infoGenre.textContent = (ip.genres && ip.genres[0]) || '미지정';
  const infoFormat = document.getElementById('ipdInfoFormat');
  if (infoFormat) infoFormat.textContent = goalLabel || '미지정';
  const infoStart = document.getElementById('ipdInfoStart');
  if (infoStart) {
    infoStart.textContent = ip.createdAt
      ? new Date(ip.createdAt).toISOString().slice(0, 10).replace(/-/g, '.')
      : '-';
  }
  const infoVis = document.getElementById('ipdInfoVis');
  if (infoVis) infoVis.textContent = '전체 공개 (참여형)';

  // Same growth-stage computation OPEN DNA and CONTENT ROOM use, so this
  // page never shows a different stage than wherever the user arrived from.
  const stageLabel = typeof bearipGrowthStage === 'function' && typeof BEARIP_STAGE_LABELS === 'object'
    ? BEARIP_STAGE_LABELS[bearipGrowthStage(ip.dnaScore || 0)]
    : 'RISING';
  const infoStage = document.getElementById('ipdInfoStage');
  if (infoStage) infoStage.textContent = stageLabel;
  const heroStage = document.getElementById('ipdHeroStage');
  if (heroStage) heroStage.textContent = stageLabel;

  ipdRenderGmMaterials(ip);
}

// GM-only — 제작 시뮬레이션을 위해 개발 맵의 각 항목에 실제 등록된 자료(이미지/문서/메모)를
// 그대로 보여준다. ip-detail.html은 보통 공개용 요약(소개/참여 크리에이터 등)만 보여주는
// 페이지라 이 항목이 없었는데, 그 요약만으로는 GM이 실제로 검토/제작할 내용을 알 수 없었다.
function ipdRenderGmMaterials(ip) {
  const existing = document.getElementById('ipdGmMaterials');
  if (existing) existing.remove();

  const user = typeof bearipGetUser === 'function' ? bearipGetUser() : null;
  if (!user || user.nickname !== 'GM') return;

  const mainCol = document.querySelector('.ipd-main-col');
  if (!mainCol) return;

  ipdInjectGmMaterialsStyles();

  const esc = typeof bearipEscapeHtml === 'function' ? bearipEscapeHtml : (s) => s;
  const steps = (ip.roadmap || []).filter((s) => (s.submissions || []).length);

  const section = document.createElement('section');
  section.className = 'ipd-panel';
  section.id = 'ipdGmMaterials';

  const body = steps.length
    ? steps
        .map((step) => {
          const label = (step.label || '').replace(/<br>/g, ' ');
          const statusBits = [];
          if (step.reviewStatus === 'reviewed') statusBits.push(`검토 완료 · ${step.adminProgress}%${step.needsRevision ? ' · 보완 필요' : ''}`);
          else if (step.reviewStatus === 'requested') statusBits.push('검토 대기 중');
          if (step.mode === 'requested') statusBits.push('제작 의뢰 중');
          else if (step.mode === 'done') statusBits.push('제작 완료');
          const subsHtml = (step.submissions || [])
            .map((sub) => {
              const subLabel = sub.label ? `<div class="ipd-gm-sub-label">${esc(sub.label)}</div>` : '';
              const thumb = sub.imageData
                ? `<div class="ipd-gm-sub-thumb" style="background-image:url('${sub.imageData}')" data-full="${sub.imageData}" title="눌러서 크게 보기"></div>`
                : '';
              const fileSize = sub.fileSize ? ` · ${Math.max(1, Math.round(sub.fileSize / 1024))}KB` : '';
              const file = !sub.imageData && sub.fileName
                ? sub.fileData
                  ? `<a class="ipd-gm-sub-file" href="${sub.fileData}" download="${esc(sub.fileName)}" target="_blank" rel="noopener">${esc(sub.fileName)}${fileSize}</a>`
                  : `<div class="ipd-gm-sub-file plain">${esc(sub.fileName)}${fileSize}</div>`
                : '';
              const note = sub.note ? `<div class="ipd-gm-sub-note">"${esc(sub.note)}"</div>` : '';
              return `<div class="ipd-gm-sub">${subLabel}${thumb}${file}${note}</div>`;
            })
            .join('');
          return `
            <div class="ipd-gm-step">
              <div class="ipd-gm-step-head">
                <span class="ipd-gm-step-name">${esc(label)}</span>
                ${statusBits.length ? `<span class="ipd-gm-step-status">${esc(statusBits.join(' · '))}</span>` : ''}
              </div>
              ${subsHtml}
            </div>
          `;
        })
        .join('')
    : '<p class="desc">등록된 개발 자료가 아직 없어요.</p>';

  section.innerHTML = `
    <h2><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>개발 맵 자료<span class="ipd-gm-badge">GM 전용</span></h2>
    ${body}
  `;

  const introPanel = mainCol.querySelector('.ipd-panel');
  if (introPanel) introPanel.after(section);
  else mainCol.appendChild(section);

  section.querySelectorAll('.ipd-gm-sub-thumb').forEach((thumb) => {
    thumb.addEventListener('click', () => ipdOpenImageLightbox(thumb.dataset.full));
  });
}

// Same reasoning as ip-reviews.js's own lightbox: a submitted image forced
// into a fixed small thumb is easy to miss detail in — click to see it full
// size instead of guessing from a 140px box.
function ipdEnsureImageLightbox() {
  let overlay = document.getElementById('ipdImageLightbox');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'ipd-gm-lightbox-overlay';
  overlay.id = 'ipdImageLightbox';
  overlay.innerHTML = `
    <button type="button" class="ipd-gm-lightbox-close" aria-label="닫기">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
    <img class="ipd-gm-lightbox-img" id="ipdLightboxImg" alt="">
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('.ipd-gm-lightbox-close')) ipdCloseImageLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('show')) ipdCloseImageLightbox();
  });
  return overlay;
}

function ipdOpenImageLightbox(src) {
  if (!src) return;
  const overlay = ipdEnsureImageLightbox();
  document.getElementById('ipdLightboxImg').src = src;
  overlay.classList.add('show');
}

function ipdCloseImageLightbox() {
  const overlay = document.getElementById('ipdImageLightbox');
  if (overlay) overlay.classList.remove('show');
}

function ipdInjectGmMaterialsStyles() {
  if (document.getElementById('ipd-gm-materials-style')) return;
  const style = document.createElement('style');
  style.id = 'ipd-gm-materials-style';
  style.textContent = `
    .ipd-gm-badge { font-size: 10px; font-weight: 800; color: var(--od-purple); background: rgba(139,107,255,0.14); padding: 2px 8px; border-radius: 999px; margin-left: 8px; vertical-align: middle; }
    .ipd-gm-step { padding: 12px 0; border-bottom: 1px solid var(--od-border); }
    .ipd-gm-step:last-child { border-bottom: none; }
    .ipd-gm-step-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
    .ipd-gm-step-name { font-size: 13px; font-weight: 800; color: var(--od-ink); }
    .ipd-gm-step-status { font-size: 11px; font-weight: 700; color: var(--od-purple); white-space: nowrap; }
    .ipd-gm-sub { padding: 10px; background: var(--od-bg); border-radius: 10px; margin-bottom: 8px; font-size: 12px; color: var(--od-ink); }
    .ipd-gm-sub-label { font-weight: 700; margin-bottom: 4px; }
    .ipd-gm-sub-thumb { width: 140px; height: 140px; border-radius: 8px; background-size: cover; background-position: center; margin-bottom: 6px; cursor: zoom-in; }
    .ipd-gm-sub-file { color: var(--od-purple); text-decoration: underline; display: block; margin-bottom: 4px; word-break: break-all; }
    .ipd-gm-sub-file.plain { color: var(--od-ink-soft); text-decoration: none; }
    .ipd-gm-sub-note { color: var(--od-ink-soft); font-style: italic; }
    .ipd-gm-lightbox-overlay {
      position: fixed; inset: 0; z-index: 1200; background: rgba(10,8,16,0.82);
      display: none; align-items: center; justify-content: center; padding: 32px;
    }
    .ipd-gm-lightbox-overlay.show { display: flex; }
    .ipd-gm-lightbox-img { max-width: 100%; max-height: 100%; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
    .ipd-gm-lightbox-close {
      position: fixed; top: 20px; right: 20px; width: 38px; height: 38px; border-radius: 50%;
      border: none; background: rgba(255,255,255,0.12); color: #fff;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
    }
    .ipd-gm-lightbox-close:hover { background: rgba(255,255,255,0.22); }
    .ipd-gm-lightbox-close svg { width: 16px; height: 16px; }
  `;
  document.head.appendChild(style);
}

document.addEventListener('DOMContentLoaded', () => {
  ipdApplyDynamicIP();

  const joinBtn = document.getElementById('ipdJoinBtn');
  const followBtn = document.getElementById('ipdFollowBtn');
  const followerCountEl = document.getElementById('ipdFollowerCount');
  const baseFollowerCount = parseInt(followerCountEl.textContent, 10) || 0;

  // Restore state from a previous visit.
  ipdSetJoinedUI(joinBtn, bearipSetHas(IPD_JOIN_KEY, joinBtn.dataset.ip));
  const isFollowing = bearipSetHas(IPD_FOLLOW_KEY, followBtn.dataset.ip);
  ipdSetFollowUI(followBtn, isFollowing);
  followerCountEl.textContent = baseFollowerCount + (isFollowing ? 1 : 0);

  document.querySelectorAll('.ipd-apply-btn').forEach((btn) => {
    ipdSetApplyUI(btn, bearipSetHas(IPD_APPLY_KEY, btn.dataset.pos));
  });

  joinBtn.addEventListener('click', () => {
    if (joinBtn.disabled) return;
    if (!bearipRequireLogin('ip-detail.html')) return;
    const nowJoined = bearipSetToggle(IPD_JOIN_KEY, joinBtn.dataset.ip);
    ipdSetJoinedUI(joinBtn, nowJoined);
    if (nowJoined) {
      bearipAddNotification({
        type: 'crew',
        title: 'IP 참여를 신청했어요',
        message: `'${joinBtn.dataset.ipTitle}'에 참여 신청을 보냈어요. 오너의 승인을 기다려주세요.`,
        link: 'profile.html',
      });
    }
  });

  followBtn.addEventListener('click', () => {
    if (!bearipRequireLogin('ip-detail.html')) return;
    const nowFollowing = bearipSetToggle(IPD_FOLLOW_KEY, followBtn.dataset.ip);
    ipdSetFollowUI(followBtn, nowFollowing);
    followerCountEl.textContent = baseFollowerCount + (nowFollowing ? 1 : 0);
  });

  // 좋아요 (응원) — real IPs persist the count into ip.likes so CONTENT
  // ROOM's cards and the TOP 100 ranking reflect it; the demo project has
  // no real storage record, so it falls back to a session-local count like
  // the follow button already does for it.
  const cheerBtn = document.getElementById('ipdCheerBtn');
  const cheerCountEl = document.getElementById('ipdCheerCount');
  const IPD_LIKE_KEY = 'bearip_liked_ips';
  const baseCheerCount = bearipParseCount(cheerCountEl.textContent);
  const alreadyCheered = bearipSetHas(IPD_LIKE_KEY, cheerBtn.dataset.ip);
  cheerBtn.classList.toggle('active', alreadyCheered);
  if (!bearipLoadIPs().some((i) => i.id === cheerBtn.dataset.ip)) {
    cheerCountEl.textContent = bearipFormatCount(baseCheerCount + (alreadyCheered ? 1 : 0));
  }

  cheerBtn.addEventListener('click', () => {
    if (!bearipRequireLogin('ip-detail.html')) return;
    const nowCheered = bearipSetToggle(IPD_LIKE_KEY, cheerBtn.dataset.ip);
    cheerBtn.classList.toggle('active', nowCheered);
    const realIp = bearipLoadIPs().find((i) => i.id === cheerBtn.dataset.ip);
    if (realIp) {
      const likes = Math.max(0, (realIp.likes || 0) + (nowCheered ? 1 : -1));
      bearipUpdateIP(realIp.id, { likes });
      cheerCountEl.textContent = bearipFormatCount(likes);
    } else {
      cheerCountEl.textContent = bearipFormatCount(baseCheerCount + (nowCheered ? 1 : 0));
    }
  });

  document.querySelectorAll('.ipd-apply-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!bearipRequireLogin('ip-detail.html')) return;
      const posId = btn.dataset.pos;

      if (bearipSetHas(IPD_APPLY_KEY, posId)) {
        // Un-applying is immediate — nothing to confirm on the way out.
        bearipSetToggle(IPD_APPLY_KEY, posId);
        ipdSetApplyUI(btn, false);
        const user = bearipGetUser();
        if (user) bearipRemoveApplicantByName(posId, user.nickname);
        bearipShowToast('지원을 취소했어요');
        return;
      }

      odOpenApplyForm(`'${btn.dataset.ipTitle}' · ${btn.dataset.posTitle}`, (message) => {
        bearipSetToggle(IPD_APPLY_KEY, posId);
        ipdSetApplyUI(btn, true);
        const user = bearipGetUser();
        // Creates the same real applicant record CREW MATCH's own apply
        // button does, so the IP owner actually sees this applicant in
        // 지원자 확인 instead of the click only toggling local UI state.
        if (user) {
          const myPositions = typeof bearipGetMyPositions === 'function' ? bearipGetMyPositions() : [];
          const myPortfolio = typeof bearipLoadPortfolio === 'function' ? bearipLoadPortfolio() : [];
          const visibleCount = myPortfolio.filter((p) => p.visibility !== 'private').length;
          bearipAddApplicant(posId, {
            id: 'app_me_' + posId,
            name: user.nickname,
            role: myPositions[0] || '',
            bio: user.bio || '',
            portfolioCount: visibleCount,
            message,
            appliedAt: new Date().toISOString(),
            status: 'pending',
          });
        }
        bearipAddNotification({
          type: 'crew',
          title: '포지션에 지원했어요',
          message: `${btn.dataset.ipTitle} · ${btn.dataset.posTitle}에 지원했어요. 결과를 기다려주세요.`,
          link: 'profile.html',
        });
      });
    });
  });
});
