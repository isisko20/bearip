// Goal selector: switching the active goal (visual only for now)
document.querySelectorAll('.md-goal').forEach((goal) => {
  goal.addEventListener('click', () => {
    document.querySelectorAll('.md-goal').forEach((g) => {
      g.classList.remove('active');
      const check = g.querySelector('.md-goal-check');
      if (check) check.remove();
    });
    goal.classList.add('active');
    if (!goal.querySelector('.md-goal-check')) {
      const check = document.createElement('span');
      check.className = 'md-goal-check';
      check.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';
      goal.prepend(check);
    }
  });
});
