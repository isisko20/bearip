// First-signup guided tour — a spotlight + speech-bubble walkthrough of the
// real interface (not a separate mock screen), so what a brand-new user sees
// during the tour is exactly what they'll click on afterward. login.js sets
// a one-shot "bearip_tour_offer" flag and sends first-time signups to
// create.html; this file shows the 체험/건너뛰기 offer there and, if
// accepted, drives the tour. Currently every step lives on create.html (the
// sidebar nav is identical across every page, and the hero CTA is the first
// real action a new user needs), so no cross-page handoff is needed yet —
// but each step still carries its own `page`, so extending the tour to
// other pages later is just adding steps, not rearchitecting this.
const BEARIP_TOUR_STEPS = [
  {
    page: 'create.html',
    selector: '.dr-hero-cta.primary',
    placement: 'bottom',
    title: '새 IP 만들기',
    body: '떠오른 아이디어를 여기서 새 IP로 시작해요. 목표(웹소설·웹툰·영상·멀티포맷)를 고르고 몇 가지만 입력하면 바로 나만의 개발맵이 만들어져요.',
  },
  {
    page: 'create.html',
    selector: '.dr-nav a[href="my-dna.html"]',
    placement: 'right',
    title: 'MY DNA',
    body: '만든 IP의 실제 작업공간이에요. 개발맵을 채우고, 전문가에게 검토나 제작을 요청하고, 완성도를 확인할 수 있어요.',
  },
  {
    page: 'create.html',
    selector: '.dr-nav a[href="open-dna.html"]',
    placement: 'right',
    title: 'OPEN DNA',
    body: '다른 사람들이 공개한 IP를 구경할 수 있어요. 마음에 드는 프로젝트에는 참여를 신청할 수도 있어요.',
  },
  {
    page: 'create.html',
    selector: '.dr-nav a[href="crew-match.html"]',
    placement: 'right',
    title: 'CREW MATCH',
    body: '함께 만들 크루를 찾거나, 내 IP에 필요한 포지션을 올려서 모집할 수 있는 공간이에요.',
  },
  {
    page: 'create.html',
    selector: '.dr-nav a[href="guide.html"]',
    placement: 'right',
    title: 'GUIDE',
    body: '더 자세한 설명이 필요하면 언제든 여기로 돌아와서 확인하세요. 자주 묻는 질문도 정리돼 있어요.',
  },
];

// Compares by filename with the .html stripped, since some dev/preview
// servers rewrite to extension-less "clean" URLs (e.g. /create instead of
// /create.html) while the deployed site serves the real .html files —
// this way step.page matching works the same in both.
function bearipCurrentPageFile() {
  const last = location.pathname.split('/').pop() || 'create.html';
  return last.replace(/\.html$/, '');
}

function bearipTourActive() {
  return sessionStorage.getItem('bearip_tour_active') === '1';
}

function bearipTourStepIndex() {
  return parseInt(sessionStorage.getItem('bearip_tour_step') || '0', 10);
}

let bearipTourEls = null; // { overlay, spotlight, tooltip }
let bearipTourResizeHandler = null;

function bearipTourTeardownUI() {
  if (bearipTourEls) {
    bearipTourEls.overlay.remove();
    bearipTourEls = null;
  }
  if (bearipTourResizeHandler) {
    window.removeEventListener('resize', bearipTourResizeHandler);
    bearipTourResizeHandler = null;
  }
}

function bearipTourEnd() {
  sessionStorage.removeItem('bearip_tour_active');
  sessionStorage.removeItem('bearip_tour_step');
  bearipTourTeardownUI();
}

function bearipTourFinish() {
  bearipTourEnd();
  if (typeof bearipShowToast === 'function') bearipShowToast('둘러보기를 마쳤어요. 이제 시작해볼까요?');
}

function bearipTourGoToStep(idx) {
  const step = BEARIP_TOUR_STEPS[idx];
  if (!step) {
    bearipTourFinish();
    return;
  }
  sessionStorage.setItem('bearip_tour_active', '1');
  sessionStorage.setItem('bearip_tour_step', String(idx));
  if (bearipCurrentPageFile() !== step.page.replace(/\.html$/, '')) {
    location.href = step.page;
    return;
  }
  bearipTourRenderStep(step, idx);
}

function bearipTourNext() {
  bearipTourGoToStep(bearipTourStepIndex() + 1);
}

function bearipTourPrev() {
  bearipTourGoToStep(Math.max(0, bearipTourStepIndex() - 1));
}

function bearipTourPositionOn(target, placement) {
  const rect = target.getBoundingClientRect();
  const pad = 6;
  const { overlay, spotlight, tooltip } = bearipTourEls;
  spotlight.style.left = rect.left - pad + 'px';
  spotlight.style.top = rect.top - pad + 'px';
  spotlight.style.width = rect.width + pad * 2 + 'px';
  spotlight.style.height = rect.height + pad * 2 + 'px';

  // Measure the tooltip itself after it has real content, then clamp it
  // inside the viewport so a step near an edge never gets cut off.
  const tw = tooltip.offsetWidth || 280;
  const th = tooltip.offsetHeight || 120;
  let left;
  let top;
  if (placement === 'right') {
    left = rect.right + pad + 14;
    top = rect.top + rect.height / 2 - th / 2;
  } else {
    left = rect.left + rect.width / 2 - tw / 2;
    top = rect.bottom + pad + 14;
  }
  left = Math.max(12, Math.min(left, window.innerWidth - tw - 12));
  top = Math.max(12, Math.min(top, window.innerHeight - th - 12));
  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
}

function bearipTourRenderStep(step, idx) {
  const target = document.querySelector(step.selector);
  if (!target) {
    // The page it's supposed to live on doesn't have this element right
    // now (e.g. a future step added for logged-out-only markup) — don't
    // strand the user on a tour that can't render; just end it cleanly.
    bearipTourEnd();
    return;
  }
  target.scrollIntoView({ block: 'center', behavior: 'auto' });

  if (!bearipTourEls) {
    const overlay = document.createElement('div');
    overlay.className = 'bearip-tour-overlay';
    overlay.innerHTML = `
      <div class="bearip-tour-spotlight"></div>
      <div class="bearip-tour-tooltip">
        <div class="bearip-tour-step-count"></div>
        <div class="bearip-tour-title"></div>
        <div class="bearip-tour-body"></div>
        <div class="bearip-tour-actions">
          <button type="button" class="bearip-tour-skip">건너뛰기</button>
          <div class="bearip-tour-nav">
            <button type="button" class="bearip-tour-prev">이전</button>
            <button type="button" class="bearip-tour-next">다음</button>
          </div>
        </div>
      </div>
    `;
    // .dna-app is where every --dr-* color variable this stylesheet uses is
    // actually defined (scoped there, not on :root) — appending straight to
    // body would leave the tooltip with no real background/text color.
    (document.querySelector('.dna-app') || document.body).appendChild(overlay);
    bearipTourEls = {
      overlay,
      spotlight: overlay.querySelector('.bearip-tour-spotlight'),
      tooltip: overlay.querySelector('.bearip-tour-tooltip'),
    };
    overlay.querySelector('.bearip-tour-skip').addEventListener('click', bearipTourEnd);
    overlay.querySelector('.bearip-tour-prev').addEventListener('click', bearipTourPrev);
    overlay.querySelector('.bearip-tour-next').addEventListener('click', bearipTourNext);
    document.addEventListener('keydown', bearipTourKeydown);
    bearipTourResizeHandler = () => bearipTourPositionOn(target, step.placement);
    window.addEventListener('resize', bearipTourResizeHandler);
  }

  const { tooltip } = bearipTourEls;
  tooltip.querySelector('.bearip-tour-step-count').textContent = `${idx + 1} / ${BEARIP_TOUR_STEPS.length}`;
  tooltip.querySelector('.bearip-tour-title').textContent = step.title;
  tooltip.querySelector('.bearip-tour-body').textContent = step.body;
  tooltip.querySelector('.bearip-tour-prev').style.visibility = idx === 0 ? 'hidden' : 'visible';
  tooltip.querySelector('.bearip-tour-next').textContent = idx === BEARIP_TOUR_STEPS.length - 1 ? '완료' : '다음';

  bearipTourPositionOn(target, step.placement);
}

function bearipTourKeydown(e) {
  if (e.key === 'Escape') bearipTourEnd();
  else if (e.key === 'ArrowRight' || e.key === 'Enter') bearipTourNext();
  else if (e.key === 'ArrowLeft') bearipTourPrev();
}

function bearipTourStart() {
  bearipTourGoToStep(0);
}

// The one-shot offer shown right after a first-time signup — separate from
// the tour UI itself so "건너뛰기" here never even creates the tour state.
function bearipShowTourOffer() {
  const overlay = document.createElement('div');
  overlay.className = 'bearip-tour-offer-overlay';
  overlay.innerHTML = `
    <div class="bearip-tour-offer-box">
      <div class="bearip-tour-offer-title">Thinkit이 처음이시군요!</div>
      <p class="bearip-tour-offer-desc">화면을 직접 짚어가며 어디서 뭘 할 수 있는지 짧게 보여드릴게요. 1분이면 끝나요.</p>
      <div class="bearip-tour-offer-actions">
        <button type="button" class="bearip-tour-offer-skip">건너뛰기</button>
        <button type="button" class="bearip-tour-offer-start">둘러보기 시작</button>
      </div>
    </div>
  `;
  (document.querySelector('.dna-app') || document.body).appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('.bearip-tour-offer-skip').addEventListener('click', close);
  overlay.querySelector('.bearip-tour-offer-start').addEventListener('click', () => {
    close();
    bearipTourStart();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('bearip_tour_offer') === '1') {
    sessionStorage.removeItem('bearip_tour_offer');
    bearipShowTourOffer();
    return;
  }
  // Resuming an in-progress tour after a navigation to a later step's page.
  if (bearipTourActive()) {
    const idx = bearipTourStepIndex();
    const step = BEARIP_TOUR_STEPS[idx];
    if (step && step.page.replace(/\.html$/, '') === bearipCurrentPageFile()) bearipTourRenderStep(step, idx);
  }
});
