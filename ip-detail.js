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
  btn.textContent = applied ? '지원 완료' : '지원하기';
  btn.disabled = applied;
  btn.classList.toggle('is-done', applied);
}

document.addEventListener('DOMContentLoaded', () => {
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
      if (btn.disabled) return;
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
      }
    });
  });
});
