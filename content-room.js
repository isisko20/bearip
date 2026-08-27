// Tab filter: show only the matching row, or all rows for "전체"
document.querySelectorAll('.cr-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.cr-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');

    const target = tab.dataset.tab;
    document.querySelectorAll('.cr-row').forEach((row) => {
      if (target === 'all' || row.dataset.section === target) {
        row.hidden = false;
      } else {
        row.hidden = true;
      }
    });
  });
});

// Carousel arrows
document.querySelectorAll('.cr-carousel').forEach((carousel) => {
  const track = carousel.querySelector('.cr-carousel-track');
  const prev = carousel.querySelector('.cr-arrow.prev');
  const next = carousel.querySelector('.cr-arrow.next');
  const step = () => track.clientWidth * 0.8;
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
});
