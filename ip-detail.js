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

// Rewrites the static (서울 야행수선단) markup in place for a user-created IP,
// if the visitor arrived here via a "IP 보기 / 참여하기" click from OPEN DNA
// (open-dna-published.js sets this one-shot flag before navigating). There's
// no real multi-user data for this prototype, so anything we can't honestly
// derive from the IP itself (crew roster, past updates, published episodes)
// is shown as an empty state instead of being left as fake demo content.
function ipdApplyDynamicIP() {
  const viewId = sessionStorage.getItem('bearip_view_ip_id');
  sessionStorage.removeItem('bearip_view_ip_id');
  if (!viewId || viewId === 'seoul-night-menders') return;

  const ip = (typeof bearipLoadIPs === 'function' ? bearipLoadIPs() : []).find((i) => i.id === viewId);
  if (!ip) return;

  const esc = typeof bearipEscapeHtml === 'function' ? bearipEscapeHtml : (s) => s;
  const goalLabel = IPD_GOAL_LABELS[ip.goal] || '';

  document.title = `Thinkit — ${ip.title}`;
  document.getElementById('ipdHeroTitle').textContent = ip.title;
  document.getElementById('ipdHeroTagline').textContent = ip.logline || '아직 로그라인이 없어요.';
  document.getElementById('ipdHeroGenre').textContent = [...(ip.genres || []), goalLabel].filter(Boolean).join(' · ') || '미지정';

  const imageAsset = (ip.assets || []).find((a) => a.imageData);
  const heroBg = document.getElementById('ipdHeroBg');
  if (imageAsset) {
    heroBg.classList.remove('thumb-1');
    heroBg.style.backgroundImage = `url('${imageAsset.imageData}')`;
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

  // No real follower/cheer/activity tracking for user IPs yet — honest zeros
  // rather than carrying over the demo's fixed numbers.
  document.getElementById('ipdFollowerCount').textContent = '0';
  document.getElementById('ipdCheerCount').textContent = '0';
  document.getElementById('ipdActivityCount').textContent = '0';

  const descEl = document.querySelector('.ipd-panel p.desc');
  if (descEl) descEl.textContent = ip.synopsis || ip.logline || '아직 작성된 소개가 없어요.';

  const user = typeof bearipGetUser === 'function' ? bearipGetUser() : null;
  const creatorsWrap = document.querySelector('.ipd-creators');
  if (creatorsWrap) {
    creatorsWrap.innerHTML = `
      <div class="ipd-creator-row">
        <div class="ipd-creator-avatar thumb-2"></div>
        <div class="ipd-creator-info"><div class="n">${esc(user ? user.nickname : '나')}</div><div class="r">오너</div></div>
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
  const infoStage = document.getElementById('ipdInfoStage');
  if (infoStage) infoStage.textContent = 'RISING';
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

  document.querySelectorAll('.ipd-apply-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!bearipRequireLogin('ip-detail.html')) return;
      const nowApplied = bearipSetToggle(IPD_APPLY_KEY, btn.dataset.pos);
      ipdSetApplyUI(btn, nowApplied);
      if (nowApplied) {
        bearipAddNotification({
          type: 'crew',
          title: '포지션에 지원했어요',
          message: `${btn.dataset.ipTitle} · ${btn.dataset.posTitle}에 지원했어요. 결과를 기다려주세요.`,
          link: 'profile.html',
        });
      } else {
        bearipShowToast('지원을 취소했어요');
      }
    });
  });
});
