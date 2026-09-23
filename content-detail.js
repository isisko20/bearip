// Real episode reader — was a static single-episode mockup with a hardcoded
// demo id ('seoul-ep01') that nothing in the app ever actually linked to.
// Now driven entirely by whatever (ip, episode) was handed over just before
// navigating here (ip-detail.js's ipdGoToEpisode, content-room-published.js's
// hero 재생 button, or this file's own episode-strip/related-episode clicks) —
// same one-shot sessionStorage snapshot handoff every other cross-page IP
// view in this app already uses, since a published IP may not exist in this
// visitor's own local storage at all.

const CD_BOOKMARK_KEY = 'bearip_bookmarked_content';
const CD_COMMENT_LIKE_KEY = 'bearip_liked_comments';
const CD_THUMBS = ['thumb-1', 'thumb-2', 'thumb-3', 'thumb-4', 'thumb-5', 'thumb-6', 'thumb-7', 'thumb-8'];

function cdFormatCount(n) {
  return n.toLocaleString('ko-KR');
}

function cdFormatRelativeTime(iso) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

function cdGoToIp(ip) {
  sessionStorage.setItem('bearip_view_ip_snapshot', JSON.stringify(ip));
  location.href = 'ip-detail.html';
}

function cdGoToEpisode(ip, episodeId) {
  sessionStorage.setItem('bearip_view_ip_snapshot', JSON.stringify(ip));
  sessionStorage.setItem('bearip_view_episode_id', episodeId);
  location.href = 'content-detail.html';
}

// One-shot — refreshing this page or opening it directly (no handoff) has
// nothing to show, same architectural limit ip-detail.html's own "IP를
// 선택해주세요" placeholder already lives with.
function cdConsumeSnapshot() {
  const raw = sessionStorage.getItem('bearip_view_ip_snapshot');
  const episodeId = sessionStorage.getItem('bearip_view_episode_id');
  sessionStorage.removeItem('bearip_view_ip_snapshot');
  sessionStorage.removeItem('bearip_view_episode_id');
  if (!raw || !episodeId) return null;
  let ip;
  try {
    ip = JSON.parse(raw);
  } catch (e) {
    return null;
  }
  if (!ip || !ip.id) return null;
  const episode = (ip.episodes || []).find((e) => e.id === episodeId);
  if (!episode) return null;
  return { ip, episode };
}

function cdRenderEmpty() {
  const main = document.getElementById('cdMain');
  if (!main) return;
  main.innerHTML = `
    <div class="cd-panel" style="text-align:center; padding:60px 20px;">
      <h3 style="margin-bottom:8px;">회차를 찾을 수 없어요</h3>
      <p class="desc">Content Room이나 IP 상세 페이지에서 회차를 눌러 들어와주세요.</p>
    </div>
  `;
}

function cdRenderPlayer(ip, episode) {
  const player = document.getElementById('player');
  const badge = document.getElementById('cdPlayerBadge');
  const stage = typeof bearipGrowthStage === 'function' ? bearipGrowthStage(ip.dnaScore || 0) : 'rising';
  if (badge) {
    badge.className = `cr-tier-badge ${stage}`;
    badge.textContent = typeof BEARIP_STAGE_LABELS === 'object' ? BEARIP_STAGE_LABELS[stage] : '라이징';
  }

  const isVideo = episode.mime && episode.mime.startsWith('video/');
  const isAudio = episode.mime && episode.mime.startsWith('audio/');
  player.querySelectorAll('.cd-player-media').forEach((el) => el.remove());
  const center = document.getElementById('cdPlayerCenter');

  if (episode.fileData && isVideo) {
    player.style.backgroundImage = '';
    player.insertAdjacentHTML('afterbegin', `<video class="cd-player-media" src="${episode.fileData}" controls style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000"></video>`);
    if (center) center.style.display = 'none';
  } else if (episode.imageData) {
    player.style.backgroundImage = `url('${episode.imageData}')`;
    player.style.backgroundSize = 'cover';
    player.style.backgroundPosition = 'center';
    if (center) center.style.display = isAudio || episode.link ? 'flex' : 'none';
  } else {
    player.style.backgroundImage = '';
    player.className = `cd-player ${CD_THUMBS[Math.abs(episode.id.length) % CD_THUMBS.length]}`;
    if (center) center.style.display = 'flex';
  }

  player.onclick = () => {
    if (episode.fileData && isVideo) return; // the <video> tag handles itself
    if (episode.fileData && isAudio) {
      const audio = new Audio(episode.fileData);
      audio.play().catch(() => {});
      bearipShowToast('오디오를 재생해요');
      return;
    }
    if (episode.link) {
      window.open(episode.link, '_blank', 'noopener');
      return;
    }
    document.getElementById('cdBodyPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
}

function cdRenderEpisodeStrip(ip, episode) {
  const strip = document.getElementById('cdEpStrip');
  if (!strip) return;
  const episodes = ip.episodes || [];
  const esc = bearipEscapeHtml;
  strip.innerHTML = episodes
    .map((ep, i) => {
      const isCurrent = ep.id === episode.id;
      const thumbStyle = ep.imageData ? ` style="background-image:url('${ep.imageData}');background-size:cover;background-position:center"` : '';
      const thumbClass = ep.imageData ? '' : CD_THUMBS[i % CD_THUMBS.length];
      return `
        <a class="cd-ep-chip${isCurrent ? ' current' : ''}" href="#" data-episode-id="${esc(ep.id)}">
          <div class="thumb ${thumbClass}"${thumbStyle}></div>
          <div class="n">EP ${i + 1}</div><div class="t">${esc(ep.title || '제목 없음')}</div>
        </a>
      `;
    })
    .join('');
  strip.querySelectorAll('.cd-ep-chip').forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      if (chip.classList.contains('current')) return;
      cdGoToEpisode(ip, chip.dataset.episodeId);
    });
  });
}

function cdRenderEpisode(ip, episode) {
  document.title = `Thinkit — ${ip.title || 'IP'} ${episode.title || ''}`;
  document.getElementById('cdEpTitle').textContent = episode.title || '제목 없음';
  document.getElementById('cdIpLinkLabel').textContent = `${ip.title || 'IP'} 세계관 보기`;
  document.getElementById('cdIpLink').addEventListener('click', (e) => {
    e.preventDefault();
    cdGoToIp(ip);
  });
  const publishedAt = document.getElementById('cdPublishedAt');
  if (publishedAt && episode.createdAt) {
    const d = new Date(episode.createdAt);
    publishedAt.textContent = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} 공개`;
  }

  cdRenderPlayer(ip, episode);

  const bodyHtml = typeof bearipRenderEpisodeBodyHtml === 'function' ? bearipRenderEpisodeBodyHtml(episode, 'cd') : '';
  const bodyPanel = document.getElementById('cdBodyPanel');
  const bodyContent = document.getElementById('cdBodyContent');
  if (bodyHtml) {
    bodyPanel.style.display = '';
    bodyContent.innerHTML = bodyHtml;
  } else {
    bodyPanel.style.display = 'none';
  }

  const creatorName = ip.ownerNickname || '크리에이터';
  document.getElementById('cdCreatorAvatar').className = `cd-creator-avatar ${CD_THUMBS[creatorName.length % CD_THUMBS.length]}`;
  document.getElementById('cdCreatorName').textContent = creatorName;
  document.getElementById('cdCreatorRole').textContent = `오너 · ${ip.title || 'IP'}`;

  cdRenderEpisodeStrip(ip, episode);
}

function cdSetFollowUI(btn, following) {
  btn.textContent = following ? '팔로잉' : '팔로우';
  btn.classList.toggle('following', following);
}

function cdRenderLikeCount(ip, episode) {
  const el = document.getElementById('likeCount');
  if (el) el.textContent = cdFormatCount(typeof bearipEpisodeLikeCount === 'function' ? bearipEpisodeLikeCount(ip.id, episode.id) : 0);
}

document.addEventListener('DOMContentLoaded', () => {
  const snapshot = cdConsumeSnapshot();
  if (!snapshot) {
    cdRenderEmpty();
    return;
  }
  const { ip, episode } = snapshot;
  cdRenderEpisode(ip, episode);

  const likeBtn = document.getElementById('likeBtn');
  const bookmarkBtn = document.getElementById('bookmarkBtn');
  const shareBtn = document.getElementById('shareBtn');
  const followBtn = document.getElementById('cdFollowBtn');

  likeBtn.classList.toggle('active', bearipIsLikingEpisode(ip.id, episode.id));
  cdRenderLikeCount(ip, episode);
  likeBtn.addEventListener('click', () => {
    if (!bearipRequireLogin('content-detail.html')) return;
    if (bearipIsLikingEpisode(ip.id, episode.id)) {
      bearipUnlikeEpisode(ip.id, episode.id);
      likeBtn.classList.remove('active');
    } else {
      bearipLikeEpisode(ip.id, episode.id);
      likeBtn.classList.add('active');
    }
    cdRenderLikeCount(ip, episode);
  });
  if (typeof bearipOnDataChange === 'function') bearipOnDataChange('episodeLikes', () => cdRenderLikeCount(ip, episode));

  bookmarkBtn.classList.toggle('active', bearipSetHas(CD_BOOKMARK_KEY, episode.id));
  bookmarkBtn.addEventListener('click', () => {
    if (!bearipRequireLogin('content-detail.html')) return;
    bookmarkBtn.classList.toggle('active', bearipSetToggle(CD_BOOKMARK_KEY, episode.id));
  });

  shareBtn.addEventListener('click', () => {
    const url = location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => bearipShowToast('링크를 복사했어요'))
        .catch(() => bearipShowToast('링크 복사에 실패했어요'));
    } else {
      bearipShowToast('이 브라우저에서는 자동 복사를 지원하지 않아요');
    }
  });

  const me = typeof bearipGetUser === 'function' ? bearipGetUser() : null;
  if (me && ip.ownerNickname === me.nickname) {
    followBtn.textContent = '내 IP';
    followBtn.disabled = true;
  } else {
    cdSetFollowUI(followBtn, bearipIsFollowingIp(ip.id));
    followBtn.addEventListener('click', () => {
      if (!bearipRequireLogin('content-detail.html')) return;
      if (bearipIsFollowingIp(ip.id)) bearipUnfollowIp(ip.id);
      else bearipFollowIp(ip);
      cdSetFollowUI(followBtn, bearipIsFollowingIp(ip.id));
    });
  }

  // ---- Comments — real, per (ip, episode), reaches the IP owner's device
  // even though the commenter has no local copy of this IP at all.
  const commentList = document.getElementById('commentList');
  const commentCountEl = document.getElementById('commentCount');
  const commentCountInlineEl = document.getElementById('commentCountInline');
  const commentInput = document.getElementById('commentInput');

  function buildCommentEl(c, index) {
    const el = document.createElement('div');
    el.className = 'cd-comment';
    el.dataset.commentId = c.id;
    el.innerHTML = `
      <div class="av ${CD_THUMBS[index % CD_THUMBS.length]}"></div>
      <div class="body">
        <div class="n">${bearipEscapeHtml(c.name)}</div>
        <div class="t">${bearipEscapeHtml(c.text)}</div>
        <div class="m"><span>${cdFormatRelativeTime(c.createdAt)}</span><button class="cd-comment-like">좋아요</button></div>
      </div>
    `;
    return el;
  }

  function renderComments() {
    const comments = bearipGetEpisodeComments(ip.id, episode.id);
    commentList.innerHTML = '';
    comments.forEach((c, i) => commentList.appendChild(buildCommentEl(c, i)));
    commentCountEl.textContent = cdFormatCount(comments.length);
    commentCountInlineEl.textContent = cdFormatCount(comments.length);
    commentList.querySelectorAll('.cd-comment-like').forEach((btn) => {
      const commentId = btn.closest('.cd-comment').dataset.commentId;
      btn.classList.toggle('liked', bearipSetHas(CD_COMMENT_LIKE_KEY, commentId));
    });
  }

  function submitComment() {
    if (!bearipRequireLogin('content-detail.html')) return;
    const text = commentInput.value.trim();
    if (!text) {
      commentInput.focus();
      return;
    }
    bearipAddEpisodeComment(ip.id, episode.id, text);
    commentInput.value = '';
    renderComments();
  }

  document.getElementById('commentSubmitBtn').addEventListener('click', submitComment);
  commentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitComment();
  });

  commentList.addEventListener('click', (e) => {
    const btn = e.target.closest('.cd-comment-like');
    if (!btn) return;
    if (!bearipRequireLogin('content-detail.html')) return;
    const commentId = btn.closest('.cd-comment').dataset.commentId;
    bearipSetToggle(CD_COMMENT_LIKE_KEY, commentId);
    btn.classList.toggle('liked', bearipSetHas(CD_COMMENT_LIKE_KEY, commentId));
  });

  renderComments();
  if (typeof bearipOnDataChange === 'function') bearipOnDataChange('episodeComments', renderComments);
});
