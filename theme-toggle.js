// Light/dark toggle button for OPEN DNA / CREW MATCH / IP DETAIL — a
// site-wide preference (storage.js: bearipGetTheme/bearipSetTheme) so
// switching on one page carries over to the others. The actual
// html[data-theme] attribute is already set by an inline snippet in each
// page's <head> (before first paint, to avoid a flash of the wrong theme);
// this just keeps the button's icon in sync and wires the click.

function bearipThemeIconSvg(theme) {
  return theme === 'dark'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 14.5A8.6 8.6 0 019.5 3.2a8.6 8.6 0 1011.3 11.3z"/></svg>';
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.theme-toggle-btn').forEach((btn) => {
    const apply = (theme) => {
      btn.innerHTML = bearipThemeIconSvg(theme);
      btn.setAttribute('aria-label', theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환');
    };
    apply(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

    btn.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      bearipSetTheme(next);
      apply(next);
    });
  });
});
