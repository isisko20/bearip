// Wires the IP detail hero/recruit action buttons: 참여하기, 팔로우, 지원하기.
// All three are shared Firebase data now (ipJoinRequests / ipFollowers /
// positionApplicants, see storage.js).

// 팔로우 — real follower count and state, not a per-browser flag with a
// hardcoded 0 next to it.
function ipdRenderFollowButton() {
  const btn = document.getElementById('ipdFollowBtn');
  const countEl = document.getElementById('ipdFollowerCount');
  if (!btn || !ipdCurrentIp) return;
  ipdSetFollowUI(btn, bearipIsFollowingIp(ipdCurrentIp.id));
  if (countEl) countEl.textContent = bearipFollowerCount(ipdCurrentIp.id);
}

// 참여하기 — label/enabled state comes from the user's real join request
// (owner accept/reject included), not a local flag.
function ipdRenderJoinButton() {
  const btn = document.getElementById('ipdJoinBtn');
  if (!btn) return;
  if (!ipdCurrentIp) {
    btn.disabled = true;
    return;
  }
  const state = bearipJoinButtonState(ipdCurrentIp);
  btn.textContent = state.label;
  btn.disabled = state.disabled;
  btn.classList.toggle('is-done', state.kind !== 'none');
}

// 참여 크리에이터 — the owner plus everyone whose join request was accepted.
let ipdOwnerName = null;
function ipdRenderCrewPanel() {
  const wrap = document.querySelector('.ipd-creators');
  if (!wrap || !ipdCurrentIp) return;
  const esc = typeof bearipEscapeHtml === 'function' ? bearipEscapeHtml : (s) => s;
  const members = bearipGetJoinRequests(ipdCurrentIp.id).filter((r) => r.status === 'accepted');
  const memberHtml = members
    .map(
      (m, i) => `
      <div class="ipd-creator-row">
        <div class="ipd-creator-avatar thumb-${(i % 8) + 3}"></div>
        <div class="ipd-creator-info"><div class="n">${esc(m.name)}</div><div class="r">크루</div></div>
      </div>`
    )
    .join('');
  wrap.innerHTML = `
    <div class="ipd-creator-row">
      <div class="ipd-creator-avatar thumb-2"></div>
      <div class="ipd-creator-info"><div class="n">${esc(ipdOwnerName || '크리에이터')}</div><div class="r">오너</div></div>
      <span class="ipd-creator-badge">오너</span>
    </div>
    ${memberHtml}
    ${members.length ? '' : '<div class="ipd-creators-empty">아직 합류한 크루가 없어요. CREW MATCH에서 모집해보세요.</div>'}
  `;
}

function ipdSetFollowUI(btn, following) {
  const label = btn.querySelector('.ipd-follow-label');
  label.textContent = following ? '팔로잉' : '팔로우';
  btn.classList.toggle('is-following', following);
}

const IPD_GOAL_LABELS = { webnovel: '웹소설', webtoon: '웹툰', video: '영상', multi: '멀티포맷' };

// The IP this page is currently showing (set by ipdApplyDynamicIP) — kept so
// the recruit list can redraw when postings/applications change elsewhere.
let ipdCurrentIp = null;

function ipdFormatRelativeTime(iso) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

// "콘텐츠/회차" — this IP's real episodes (currentIP.episodes), each opening
// the real reader (content-detail.html) with this IP's full snapshot handed
// over the same one-shot sessionStorage way odBuildPublishedCard etc. already
// do — a published IP may not exist in the reader's own local storage at all.
function ipdRenderEpisodeList() {
  const countEl = document.getElementById('ipdEpCount');
  const listEl = document.querySelector('.ipd-ep-list');
  if (!countEl || !listEl || !ipdCurrentIp) return;
  const esc = typeof bearipEscapeHtml === 'function' ? bearipEscapeHtml : (s) => s;
  const episodes = ipdCurrentIp.episodes || [];
  countEl.textContent = episodes.length;

  if (!episodes.length) {
    listEl.innerHTML = '<div class="ipd-ep-empty">아직 등록된 회차가 없어요.</div>';
    return;
  }
  listEl.innerHTML = episodes
    .map((ep, i) => {
      const thumbStyle = ep.imageData ? ` style="background-image:url('${ep.imageData}');background-size:cover;background-position:center"` : '';
      const thumbClass = ep.imageData ? '' : `thumb-${(i % 8) + 1}`;
      return `
        <a class="ipd-ep-card" href="#" data-episode-id="${esc(ep.id)}">
          <div class="ipd-ep-thumb ${thumbClass}"${thumbStyle}></div>
          <div class="ipd-ep-info">
            <div class="n">EP ${i + 1}</div>
            <div class="t">${esc(ep.title || '제목 없음')}</div>
            <div class="m">${ipdFormatRelativeTime(ep.createdAt)}</div>
          </div>
          <svg class="ipd-ep-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>
        </a>
      `;
    })
    .join('');
}

function ipdGoToEpisode(episodeId) {
  if (!ipdCurrentIp) return;
  sessionStorage.setItem('bearip_view_ip_snapshot', JSON.stringify(ipdCurrentIp));
  sessionStorage.setItem('bearip_view_episode_id', episodeId);
  location.href = 'content-detail.html';
}

// "모집 중인 포지션" — this IP's real CREW MATCH postings (Firebase), each with
// an apply button that reflects the user's actual application status. Rebuilt
// wholesale on every change; clicks are handled by one delegated listener
// (see DOMContentLoaded below), so re-rendering never loses button wiring.
function ipdRenderRecruitPanel() {
  const panel = document.getElementById('ipdRecruitPanel');
  if (!panel || !ipdCurrentIp) return;
  const ip = ipdCurrentIp;
  const esc = typeof bearipEscapeHtml === 'function' ? bearipEscapeHtml : (s) => s;

  panel.querySelectorAll('.ipd-recruit-row, .ipd-recruit-empty').forEach((el) => el.remove());
  const positions = (typeof bearipLoadPositions === 'function' ? bearipLoadPositions() : []).filter((p) =>
    p.ipId ? p.ipId === ip.id : p.ipTitle === ip.title
  );
  if (positions.length === 0) {
    panel.insertAdjacentHTML('beforeend', '<div class="ipd-recruit-empty">아직 모집 중인 포지션이 없어요.</div>');
    return;
  }
  positions.forEach((pos) => {
    const state = bearipApplyButtonState(pos);
    panel.insertAdjacentHTML(
      'beforeend',
      `<div class="ipd-recruit-row">
        <div class="ipd-recruit-info"><div class="r">${esc(pos.role)}</div><div class="f">${pos.filled || 0}/${pos.count} 참여</div></div>
        <button class="ipd-apply-btn${state.kind === 'pending' ? ' is-done' : ''}${state.kind === 'accepted' || state.kind === 'rejected' || state.kind === 'owner' ? ' is-final' : ''}"${state.disabled ? ' disabled' : ''} data-pos="${bearipEscapeAttr(pos.id)}">${esc(state.label)}</button>
      </div>`
    );
  });
}

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

  // No real activity tracking for user IPs yet — an honest zero rather than
  // carrying over the demo's fixed number. 좋아요 is real, though: it's the
  // same count CONTENT ROOM and TOP 100 read; 팔로워 is set below.
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
  ipdOwnerName = ownerName;

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

  ipdCurrentIp = ip;
  ipdRenderEpisodeList();
  ipdRenderRecruitPanel();
  ipdRenderCrewPanel();
  ipdRenderJoinButton();
  ipdRenderFollowButton();

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
              const isAudio = !sub.imageData && sub.fileData && typeof bearipIsAudioSubmission === 'function' && bearipIsAudioSubmission(sub);
              const file = !sub.imageData && sub.fileName
                ? isAudio
                  ? `<div class="ipd-gm-sub-audio"><div class="ipd-gm-sub-file plain">${esc(sub.fileName)}${fileSize}</div><audio controls preload="metadata" src="${sub.fileData}"></audio></div>`
                  : sub.fileData
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
    .ipd-gm-sub-audio { display: flex; flex-direction: column; gap: 6px; margin-bottom: 4px; }
    .ipd-gm-sub-audio audio { width: 100%; height: 36px; }
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

  // Restore state from a previous visit.
  ipdRenderJoinButton();
  ipdRenderFollowButton();

  if (typeof bearipOnDataChange === 'function') {
    bearipOnDataChange('positions', ipdRenderRecruitPanel);
    bearipOnDataChange('positionApplicants', ipdRenderRecruitPanel);
    bearipOnDataChange('ipJoinRequests', ipdRenderJoinButton);
    bearipOnDataChange('ipJoinRequests', ipdRenderCrewPanel);
    bearipOnDataChange('ipFollowers', ipdRenderFollowButton);
  }

  joinBtn.addEventListener('click', () => {
    if (joinBtn.disabled || !ipdCurrentIp) return;
    if (!bearipRequireLogin('ip-detail.html')) return;
    const state = bearipJoinButtonState(ipdCurrentIp);

    if (state.kind === 'pending') {
      // Withdrawing is immediate — nothing to confirm on the way out.
      bearipCancelJoinRequest(ipdCurrentIp.id);
      bearipShowToast('참여 신청을 취소했어요');
      ipdRenderJoinButton();
      return;
    }
    if (state.kind !== 'none') return;

    odOpenApplyForm(
      `'${ipdCurrentIp.title}'`,
      (message) => {
        bearipRequestToJoinIp(ipdCurrentIp, message);
        ipdRenderJoinButton();
      },
      { title: '참여 신청', submitLabel: '신청하기' }
    );
  });

  followBtn.addEventListener('click', () => {
    if (!bearipRequireLogin('ip-detail.html') || !ipdCurrentIp) return;
    if (bearipIsFollowingIp(ipdCurrentIp.id)) bearipUnfollowIp(ipdCurrentIp.id);
    else bearipFollowIp(ipdCurrentIp);
    ipdRenderFollowButton();
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

  // Delegated: the recruit list is rebuilt whenever postings/applications
  // change, so buttons can't be wired one by one at load.
  document.addEventListener('click', (e) => {
    const epCard = e.target.closest('.ipd-ep-card');
    if (epCard) {
      e.preventDefault();
      ipdGoToEpisode(epCard.dataset.episodeId);
      return;
    }
    const btn = e.target.closest('.ipd-apply-btn');
    if (!btn || btn.disabled) return;
    if (!bearipRequireLogin('ip-detail.html')) return;
    const pos = bearipLoadPositions().find((p) => p.id === btn.dataset.pos);
    if (!pos) return;
    const state = bearipApplyButtonState(pos);

    if (state.kind === 'pending') {
      // Un-applying is immediate — nothing to confirm on the way out.
      const user = bearipGetUser();
      if (user) bearipRemoveApplicantByName(pos.id, user.nickname);
      bearipShowToast('지원을 취소했어요');
      ipdRenderRecruitPanel();
      return;
    }
    if (state.kind !== 'none') return;

    odOpenApplyForm(`'${pos.ipTitle}' · ${pos.role}`, (message) => {
      // Same real applicant record (and owner notification) CREW MATCH's own
      // apply button creates, so the owner sees this in 지원자 확인.
      bearipApplyToPosition(pos, message);
      ipdRenderRecruitPanel();
    });
  });
});
