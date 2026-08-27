// Carousel arrows
document.querySelectorAll('.dr-carousel').forEach((carousel) => {
  const track = carousel.querySelector('.dr-carousel-track');
  const prev = carousel.querySelector('.dr-arrow.prev');
  const next = carousel.querySelector('.dr-arrow.next');
  const step = () => track.clientWidth * 0.6;
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
});

// Top-3 tab switching (visual state only)
document.querySelectorAll('.dr-tabs').forEach((tabs) => {
  tabs.querySelectorAll('.dr-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.querySelectorAll('.dr-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
});
