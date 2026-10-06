// Carousel arrows
document.querySelectorAll('.dr-carousel').forEach((carousel) => {
  const track = carousel.querySelector('.dr-carousel-track');
  const prev = carousel.querySelector('.dr-arrow.prev');
  const next = carousel.querySelector('.dr-arrow.next');
  const step = () => track.clientWidth * 0.6;
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
});
