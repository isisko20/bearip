document.addEventListener('DOMContentLoaded', () => {
  const existing = bearipGetUser();
  if (existing) {
    document.getElementById('lgNickname').value = existing.nickname || '';
    document.getElementById('lgBio').value = existing.bio || '';
  }

  document.getElementById('lgSubmitBtn').addEventListener('click', () => {
    const nicknameInput = document.getElementById('lgNickname');
    const nickname = nicknameInput.value.trim();
    const errorEl = document.getElementById('lgNicknameError');

    if (!nickname) {
      errorEl.classList.add('show');
      nicknameInput.classList.add('error-field');
      nicknameInput.focus();
      return;
    }
    errorEl.classList.remove('show');
    nicknameInput.classList.remove('error-field');

    const isFirstSignup = !existing;
    const bio = document.getElementById('lgBio').value.trim();
    bearipSetUser({
      nickname,
      bio,
      joinedAt: existing ? existing.joinedAt : new Date().toISOString(),
    });

    const next = sessionStorage.getItem('bearip_login_next');
    sessionStorage.removeItem('bearip_login_next');
    // Only allow relative same-site targets — never follow an absolute/external URL.
    const safeNext = next && !/^https?:\/\//i.test(next) ? next : 'profile.html';

    // First-ever signup on this browser gets offered a quick guided tour
    // (tour.js) instead of going straight where they were headed — the tour
    // currently lives entirely on create.html, so that's where this sends
    // them; a returning login (or a skip) goes to safeNext as before.
    if (isFirstSignup) {
      sessionStorage.setItem('bearip_tour_offer', '1');
      location.href = 'create.html';
    } else {
      location.href = safeNext;
    }
  });
});
