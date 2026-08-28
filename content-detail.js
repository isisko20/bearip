// Content detail actions: like, bookmark, share, and posting a comment.

const CD_LIKE_KEY = 'bearip_liked_content';
const CD_BOOKMARK_KEY = 'bearip_bookmarked_content';

function cdFormatCount(n) {
  return n.toLocaleString('ko-KR');
}

function cdParseCount(text) {
  return parseInt(String(text).replace(/,/g, ''), 10) || 0;
}

document.addEventListener('DOMContentLoaded', () => {
  const contentId = document.querySelector('.cd-main').dataset.contentId;
  const likeBtn = document.getElementById('likeBtn');
  const bookmarkBtn = document.getElementById('bookmarkBtn');
  const shareBtn = document.getElementById('shareBtn');
  const likeCountEl = document.getElementById('likeCount');
  const baseLikeCount = cdParseCount(likeCountEl.textContent);

  // Restore state from a previous visit.
  const alreadyLiked = bearipSetHas(CD_LIKE_KEY, contentId);
  likeBtn.classList.toggle('active', alreadyLiked);
  likeCountEl.textContent = cdFormatCount(baseLikeCount + (alreadyLiked ? 1 : 0));
  bookmarkBtn.classList.toggle('active', bearipSetHas(CD_BOOKMARK_KEY, contentId));

  likeBtn.addEventListener('click', () => {
    if (!bearipRequireLogin('content-detail.html')) return;
    const liked = bearipSetToggle(CD_LIKE_KEY, contentId);
    likeBtn.classList.toggle('active', liked);
    likeCountEl.textContent = cdFormatCount(baseLikeCount + (liked ? 1 : 0));
  });

  bookmarkBtn.addEventListener('click', () => {
    if (!bearipRequireLogin('content-detail.html')) return;
    const bookmarked = bearipSetToggle(CD_BOOKMARK_KEY, contentId);
    bookmarkBtn.classList.toggle('active', bookmarked);
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

  // ---- Comments ----
  const commentList = document.getElementById('commentList');
  const commentCountEl = document.getElementById('commentCount');
  const commentCountInlineEl = document.getElementById('commentCountInline');
  const commentInput = document.getElementById('commentInput');
  const baseCommentCount = cdParseCount(commentCountEl.textContent);

  function renderSavedComments() {
    const saved = bearipLoadComments(contentId);
    saved.forEach((c) => commentList.insertBefore(buildCommentEl(c), commentList.firstChild));
    const total = baseCommentCount + saved.length;
    commentCountEl.textContent = cdFormatCount(total);
    commentCountInlineEl.textContent = cdFormatCount(total);
  }

  function buildCommentEl(c) {
    const el = document.createElement('div');
    el.className = 'cd-comment';
    el.innerHTML = `
      <div class="av ${c.thumb || 'thumb-6'}"></div>
      <div class="body">
        <div class="n">${bearipEscapeHtml(c.name)}</div>
        <div class="t">${bearipEscapeHtml(c.text)}</div>
        <div class="m"><span>방금 전</span><span>좋아요 0</span></div>
      </div>
    `;
    return el;
  }

  function submitComment() {
    if (!bearipRequireLogin('content-detail.html')) return;
    const text = commentInput.value.trim();
    if (!text) {
      commentInput.focus();
      return;
    }
    const user = bearipGetUser();
    const comment = { name: user.nickname, text, thumb: 'thumb-6', createdAt: new Date().toISOString() };
    bearipAddComment(contentId, comment);
    commentList.insertBefore(buildCommentEl(comment), commentList.firstChild);
    const total = cdParseCount(commentCountEl.textContent) + 1;
    commentCountEl.textContent = cdFormatCount(total);
    commentCountInlineEl.textContent = cdFormatCount(total);
    commentInput.value = '';
  }

  document.getElementById('commentSubmitBtn').addEventListener('click', submitComment);
  commentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitComment();
  });

  renderSavedComments();
});
