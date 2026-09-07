// "내 프로젝트 관리" — lists every IP the user has created, with an 열기
// (open in MY DNA) and 삭제 (delete) action per card.

const MP_GOAL_LABELS = { webnovel: '웹소설', webtoon: '웹툰', video: '영상', multi: '멀티포맷' };

function mpFormatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} 생성`;
}

function mpBuildCard(ip) {
  const el = document.createElement('article');
  el.className = 'mp-card';

  const imageAsset = (ip.assets || []).find((a) => a.imageData);
  const thumbStyle = imageAsset ? ` style="background-image:url('${imageAsset.imageData}')"` : '';
  const thumbIcon = imageAsset
    ? ''
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 15l5-5 4 4 4-4 5 5"/><circle cx="8" cy="9" r="1.4"/></svg>';
  const isPublic = ip.visibility === 'public';
  const goalLabel = MP_GOAL_LABELS[ip.goal] || '';
  const metaParts = [goalLabel, ...(ip.genres || [])].filter(Boolean);
  metaParts.push(`DNA ${ip.dnaScore || 0}%`);

  el.innerHTML = `
    <div class="mp-thumb"${thumbStyle}>
      ${thumbIcon}
      <span class="mp-vis${isPublic ? '' : ' private'}">${isPublic ? '전체 공개' : '비공개'}</span>
    </div>
    <div class="mp-body">
      <div class="mp-title">${bearipEscapeHtml(ip.title || '제목 없는 IP')}</div>
      <div class="mp-meta">${bearipEscapeHtml(metaParts.join(' · '))}</div>
      <div class="mp-date">${mpFormatDate(ip.createdAt)}</div>
    </div>
    <div class="mp-actions">
      <button type="button" class="mp-open-btn" data-open-id="${ip.id}">열기</button>
      <button type="button" class="mp-delete-btn" data-delete-id="${ip.id}">삭제</button>
    </div>
  `;

  el.querySelector('.mp-open-btn').addEventListener('click', () => {
    bearipSetCurrentId(ip.id);
    location.href = 'my-dna.html';
  });
  el.querySelector('.mp-delete-btn').addEventListener('click', () => mpConfirmDelete(ip));

  return el;
}

function mpRenderGrid() {
  const grid = document.getElementById('mpGrid');
  const empty = document.getElementById('mpEmpty');
  const ips = typeof bearipLoadIPs === 'function' ? bearipLoadIPs() : [];

  grid.innerHTML = '';
  if (ips.length === 0) {
    grid.style.display = 'none';
    empty.style.display = 'flex';
    return;
  }
  grid.style.display = '';
  empty.style.display = 'none';
  ips.forEach((ip) => grid.appendChild(mpBuildCard(ip)));
}

// Built and appended fresh each time it's needed, then removed on
// close/confirm — avoids the display/hidden footgun of a persistent overlay
// that lives in the DOM with its own CSS display rule (see my-dna-render.js's
// overlays for the same pattern).
function mpConfirmDelete(ip) {
  const overlay = document.createElement('div');
  overlay.className = 'mp-confirm-overlay';
  overlay.innerHTML = `
    <div class="mp-confirm-box">
      <div class="mp-confirm-title">'${bearipEscapeHtml(ip.title || '제목 없는 IP')}'을(를) 삭제할까요?</div>
      <div class="mp-confirm-desc">삭제하면 DNA 현황, 자산, 토론 내용은 물론 이 IP로 올린 크루매치 모집글과 지원자 기록까지 모두 사라지고 되돌릴 수 없어요.</div>
      <div class="mp-confirm-actions">
        <button type="button" class="mp-confirm-cancel">취소</button>
        <button type="button" class="mp-confirm-delete">삭제하기</button>
      </div>
    </div>
  `;
  (document.querySelector('.dna-app') || document.body).appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('.mp-confirm-cancel').addEventListener('click', close);
  overlay.querySelector('.mp-confirm-delete').addEventListener('click', () => {
    bearipDeleteIP(ip.id);
    close();
    mpRenderGrid();
    bearipShowToast(`'${ip.title || '제목 없는 IP'}'을(를) 삭제했어요`);
  });
}

document.addEventListener('DOMContentLoaded', mpRenderGrid);
