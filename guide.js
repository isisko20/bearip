document.querySelectorAll('.gd-faq-item .gd-faq-q').forEach((btn) => {
  btn.addEventListener('click', () => {
    btn.closest('.gd-faq-item').classList.toggle('open');
  });
});
