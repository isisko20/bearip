// Injects locally-saved IPs (created via new-ip.html) into the DNA ROOM home dashboard.
document.addEventListener('DOMContentLoaded', () => {
  const ips = typeof bearipLoadIPs === 'function' ? bearipLoadIPs() : [];
  if (ips.length === 0) return;

  const track = document.getElementById('myDnaTrack');
  const thumbClasses = ['thumb-6', 'thumb-3', 'thumb-4', 'thumb-2', 'thumb-1'];

  ips.forEach((ip, i) => {
    const card = document.createElement('article');
    card.className = 'dr-card';
    card.style.cursor = 'pointer';
    card.onclick = () => {
      bearipSetCurrentId(ip.id);
      location.href = 'my-dna.html';
    };
    const genreText = ip.genres && ip.genres.length ? ip.genres.join(', ') : '장르 미정';
    const dna = ip.dnaScore || 0;
    card.innerHTML = `
      <div class="thumb ${thumbClasses[i % thumbClasses.length]}"><span class="tlabel">${ip.title}</span></div>
      <div class="title">${ip.title}</div>
      <div class="genre">${genreText}</div>
      <div class="dna-bar"><div class="dna-bar-fill" style="width:${dna}%"></div></div>
      <div class="dna-label">DNA ${dna}%</div>
    `;
    track.insertBefore(card, track.firstChild);
  });

  const ipCountStat = document.getElementById('ipCountStat');
  if (ipCountStat) {
    const base = parseInt(ipCountStat.textContent, 10) || 0;
    ipCountStat.textContent = base + ips.length;
  }
});
