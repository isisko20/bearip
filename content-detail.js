// Like toggle
const likeBtn = document.getElementById('likeBtn');
if (likeBtn) {
  likeBtn.addEventListener('click', () => likeBtn.classList.toggle('liked'));
}
