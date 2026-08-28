// DISCUSSION tab: posting, liking, and replying to crew updates.
// currentIP / renderDiscussion / persistDiscussion come from my-dna-render.js
// (plain <script> tags share one global scope on this page).

function mdSubmitDiscussionPost() {
  if (!bearipRequireLogin('my-dna.html')) return;

  const input = document.getElementById('discussInput');
  const text = input.value.trim();
  if (!text) {
    input.focus();
    return;
  }

  const user = bearipGetUser();
  const post = {
    id: 'dc_' + Date.now(),
    name: user.nickname,
    role: '크루원',
    text,
    likes: 0,
    likedByMe: false,
    thumb: 'thumb-6',
    createdAt: new Date().toISOString(),
  };

  currentIP.discussion = [post, ...(currentIP.discussion || [])];
  persistDiscussion();
  renderDiscussion();
  input.value = '';
}

function mdToggleDiscussionLike(id) {
  const post = (currentIP.discussion || []).find((p) => p.id === id);
  if (!post) return;
  post.likedByMe = !post.likedByMe;
  post.likes += post.likedByMe ? 1 : -1;
  persistDiscussion();
  renderDiscussion();
}

function mdReplyToDiscussionPost(id) {
  const post = (currentIP.discussion || []).find((p) => p.id === id);
  if (!post) return;
  const input = document.getElementById('discussInput');
  input.value = `@${post.name} `;
  input.focus();
  input.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('discussPostBtn').addEventListener('click', mdSubmitDiscussionPost);
  document.getElementById('discussInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') mdSubmitDiscussionPost();
  });

  // Event delegation: the list is re-rendered on every post/like, so bind
  // once on the container instead of on each (disposable) item.
  document.getElementById('discussList').addEventListener('click', (e) => {
    const likeBtn = e.target.closest('.md-discuss-like');
    if (likeBtn) {
      mdToggleDiscussionLike(likeBtn.dataset.id);
      return;
    }
    const replyBtn = e.target.closest('.md-discuss-reply');
    if (replyBtn) {
      mdReplyToDiscussionPost(replyBtn.dataset.id);
    }
  });
});
