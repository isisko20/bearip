// Wires the profile chip / avatar button in every page's header to the
// mock login state — shows the real nickname when signed in, and routes
// to login.html or profile.html on click.
document.addEventListener('DOMContentLoaded', () => {
  const user = typeof bearipGetUser === 'function' ? bearipGetUser() : null;
  const dest = user ? 'profile.html' : 'login.html';

  if (typeof bearipSeedNotificationsIfEmpty === 'function') bearipSeedNotificationsIfEmpty();
  const unread = typeof bearipGetUnreadCount === 'function' ? bearipGetUnreadCount() : 0;

  document.querySelectorAll('.dr-icon-btn[aria-label="알림"], .od-icon-btn[aria-label="알림"]').forEach((btn) => {
    let dot = btn.querySelector('.dot');
    if (unread > 0 && !dot) {
      dot = document.createElement('span');
      dot.className = 'dot';
      btn.appendChild(dot);
    }
    if (dot) dot.style.display = unread > 0 ? '' : 'none';
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', () => {
      location.href = 'notifications.html';
    });
  });

  document.querySelectorAll('.dr-profile-chip').forEach((chip) => {
    const nameEl = chip.querySelector('.uname');
    if (nameEl) nameEl.textContent = user ? user.nickname : '로그인';
    chip.style.cursor = 'pointer';
    chip.addEventListener('click', () => {
      location.href = dest;
    });
  });

  document.querySelectorAll('.od-avatar-chip').forEach((chip) => {
    chip.style.cursor = 'pointer';
    chip.addEventListener('click', () => {
      location.href = dest;
    });
  });

  document.querySelectorAll('.cr-profile').forEach((btn) => {
    btn.addEventListener('click', () => {
      location.href = dest;
    });
  });
});
