// MY DNA 개발 맵 "이렇게 써요" 안내 — 처음 들어온 사람에게 한 번 보여주고, 개발 맵 제목 옆의
// "사용법" 버튼으로 언제든 다시 볼 수 있어요. 업로드 → 필수 요소 확인 → 작성 완성도 → 띵킷 분석·의뢰하기
// 흐름을 네 장으로 설명해요. (화면에는 누가 처리하는지 따로 밝히지 않고 "확인해요"로만 말해요.)
const MD_INTRO_KEY = 'bearip_dna_intro_v1';

const MD_INTRO_SLIDES = [
  {
    title: '단계마다 자료를 올려요',
    body: '개발 맵의 단계마다 "업로드"로 내 자료를 올려요. 목표 수량(예: 시나리오 총 몇 화)을 정하고, 이 작품에 필요 없는 단계는 0으로 두면 계산에서 빠져요.',
    chips: ['업로드', '목표 수량', '필요 없으면 0'],
  },
  {
    title: '필수 요소를 자동으로 확인해요',
    body: '시나리오·캐릭터 설정·세계관 자료를 올리면 꼭 필요한 요소가 들어 있는지 살펴보고, 빠진 요소의 이름을 카드의 "빠진 항목"으로 알려드려요. 내용이 좋은지는 판단하지 않아요.',
    chips: ['주인공', '시작 사건', '목표', '결말', '…'],
  },
  {
    title: '작성 완성도가 올라가요',
    body: '목표 수량을 필수 요소로 얼마나 채웠는지가 작성 완성도예요. 빠진 요소를 채워서 다시 저장하면 올라가요. 그림·영상처럼 글로 확인하기 어려운 항목은 올린 것만 세어요.',
    chips: ['빠진 항목 확인', '채워서 다시 저장'],
  },
  {
    title: '100%가 되면 띵킷 분석',
    body: '작성 완성도가 100%가 되면 "분석하기"(무료)로 준비도를 퍼센트로 받아요. 그 전에는 "분석 전"으로 보여요. 구체적인 보완 의견이나 제작이 필요한 단계는 카드의 "의뢰하기"(크레딧)를 눌러요.',
    chips: ['분석하기 · 무료', '의뢰하기 · 크레딧'],
  },
];

function mdIntroSeen() {
  try {
    return localStorage.getItem(bearipScopedKey(MD_INTRO_KEY)) === '1';
  } catch (e) {
    return true; // 저장소를 못 쓰면 매번 띄우지 않아요
  }
}

function mdIntroMarkSeen() {
  try {
    localStorage.setItem(bearipScopedKey(MD_INTRO_KEY), '1');
  } catch (e) {
    /* 저장 못 해도 안내만 안 기억될 뿐이에요 */
  }
}

function mdOpenIntro() {
  if (document.getElementById('mdIntroOverlay')) return;
  let index = 0;
  const overlay = document.createElement('div');
  overlay.className = 'md-intro-overlay';
  overlay.id = 'mdIntroOverlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '개발 맵 사용법');
  (document.querySelector('.dna-app') || document.body).appendChild(overlay);

  const close = () => {
    mdIntroMarkSeen();
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);

  function render() {
    const slide = MD_INTRO_SLIDES[index];
    const last = index === MD_INTRO_SLIDES.length - 1;
    overlay.innerHTML = `
      <div class="md-intro-box">
        <button type="button" class="md-intro-close" aria-label="닫기">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
        <div class="md-intro-step">${index + 1} / ${MD_INTRO_SLIDES.length}</div>
        <h3 class="md-intro-title">${bearipEscapeHtml(slide.title)}</h3>
        <p class="md-intro-body">${bearipEscapeHtml(slide.body)}</p>
        <div class="md-intro-chips">${slide.chips.map((c) => `<span>${bearipEscapeHtml(c)}</span>`).join('')}</div>
        <div class="md-intro-dots">${MD_INTRO_SLIDES.map((_, i) => `<i class="${i === index ? 'on' : ''}"></i>`).join('')}</div>
        <div class="md-intro-actions">
          <button type="button" class="md-intro-prev" ${index === 0 ? 'disabled' : ''}>이전</button>
          <button type="button" class="md-intro-next">${last ? '시작하기' : '다음'}</button>
        </div>
      </div>`;
    overlay.querySelector('.md-intro-close').addEventListener('click', close);
    overlay.querySelector('.md-intro-prev').addEventListener('click', () => {
      index = Math.max(0, index - 1);
      render();
    });
    overlay.querySelector('.md-intro-next').addEventListener('click', () => {
      if (last) close();
      else {
        index += 1;
        render();
      }
    });
    overlay.querySelector('.md-intro-next').focus();
  }
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  render();
}

document.addEventListener('DOMContentLoaded', () => {
  const helpBtn = document.getElementById('mdIntroBtn');
  if (helpBtn) helpBtn.addEventListener('click', mdOpenIntro);
  if (mdIntroSeen()) return;
  // 개발 맵이 그려지고, 다른 안내 창(PIN 설정 등)이 없을 때 띄워요. PIN 설정 창이 떠 있으면 그 창을
  // 닫을 때까지 기다려요 (PIN을 아직 안 정한 사람은 그 창이 매번 뜨니까요). 1분 안에 안 닫으면 다음 방문에.
  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    if (mdIntroSeen() || !document.getElementById('roadmapContainer') || tries > 40) {
      clearInterval(timer);
      return;
    }
    if (tries < 2 || document.getElementById('bearipAccountOverlay') || document.getElementById('mdIntroOverlay')) return;
    clearInterval(timer);
    mdOpenIntro();
  }, 1500);
});
