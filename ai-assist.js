// AI 시나리오 도움받기 — MY DNA의 현재 IP 정보와 질문을 서버 함수(functions/index.js)로
// 보내면, 운영자가 정리한 스토리 설계 매뉴얼을 기준으로 AI가 조언해줘요.
//   · 무료(Gemma 4): 입력 내용이 구글로 전송되고 서비스 개선에 쓰일 수 있어서,
//     처음 쓸 때 반드시 동의를 받아요 (서버도 동의 기록이 없으면 호출을 거절해요).
//   · 고급 AI(Claude·GPT 등): 아직 구현 중이라 선택할 수 없는 표시만 해둬요.
// 하루 사용 횟수와 켜기/끄기는 서버가 강제해요 — 화면은 서버가 알려준 값만 보여줘요.

const AI_GOAL_LABELS = { webnovel: '웹소설', webtoon: '웹툰', video: '영상', multi: '멀티포맷' };
const AI_QUICK_QUESTIONS = ['세계관에서 빈 곳을 짚어줘', '주인공의 약점 후보를 제안해줘', '다음 회차 아이디어를 3개 줘'];
const AI_PRESETS = {
  world: '지금 내 작품의 세계관에서 부족한 부분을 매뉴얼 기준으로 점검하고, 보완할 선택지를 제안해줘.',
  story: '지금 내 작품의 시작 사건과 전체 흐름을 점검하고, 연재를 이어가는 반복 사건 아이디어를 제안해줘.',
};

function aiInjectStyles() {
  if (document.getElementById('bearip-ai-style')) return;
  bearipInjectReportStyles();
  const style = document.createElement('style');
  style.id = 'bearip-ai-style';
  style.textContent = `
    .bearip-ai-box { max-width: 520px !important; }
    .bearip-ai-box .ai-tiers { display: flex; gap: 6px; margin: 10px 0 14px; flex-wrap: wrap; }
    .bearip-ai-box .ai-tier {
      padding: 7px 12px; border-radius: 999px; font: inherit; font-size: 12px; font-weight: 800; cursor: pointer;
      border: 1px solid var(--rp-border); background: transparent; color: var(--rp-ink);
    }
    .bearip-ai-box .ai-tier.active { background: var(--rp-purple); border-color: var(--rp-purple); color: #fff; }
    .bearip-ai-box .ai-tier[data-soon] { opacity: 0.55; }
    .bearip-ai-box .ai-quick { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .bearip-ai-box .ai-quick button {
      padding: 5px 10px; border-radius: 999px; font: inherit; font-size: 11.5px; cursor: pointer;
      border: 1px solid var(--rp-border); background: transparent; color: var(--rp-ink-soft);
    }
    .bearip-ai-box .ai-quick button:hover { color: var(--rp-purple); border-color: var(--rp-purple); }
    .bearip-ai-box textarea { min-height: 84px; }
    .bearip-ai-box .ai-answer {
      margin-top: 14px; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--rp-border);
      font-size: 13px; line-height: 1.75; word-break: break-word;
    }
    .bearip-ai-box .ai-answer strong { font-weight: 800; }
    .bearip-ai-box .ai-error { margin-top: 10px; font-size: 12px; color: #e5484d; }
    .bearip-ai-box .ai-foot { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 12px; font-size: 11.5px; color: var(--rp-ink-soft); }
    .bearip-ai-box .ai-foot button { border: none; background: none; padding: 0; font: inherit; color: inherit; cursor: pointer; text-decoration: underline; }
    .bearip-ai-box .ai-loading { padding: 26px 0; text-align: center; font-size: 12.5px; color: var(--rp-ink-soft); }
  `;
  document.head.appendChild(style);
}

// 모델이 쓰는 마크다운(##, **, - )을 안전하게 최소한만 보여줘요 (HTML은 먼저 이스케이프).
function aiFormatAnswer(text) {
  return bearipEscapeHtml(text)
    .split('\n')
    .map((line) => {
      let l = line.replace(/^#{1,4}\s+(.*)$/, '<strong>$1</strong>');
      l = l.replace(/^\s*[-*]\s+/, '• ');
      return l.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    })
    .join('<br>');
}

function aiBuildIpPayload(ip) {
  return {
    title: ip.title || '',
    goal: AI_GOAL_LABELS[ip.goal] || ip.goal || '',
    genres: ip.genres || [],
    logline: ip.logline || '',
    synopsis: ip.synopsis || '',
    episodes: (ip.episodes || []).map((e) => e.title || '').filter(Boolean),
  };
}

function bearipOpenAiAssist(opts) {
  if (document.getElementById('aiAssistOverlay')) return;
  if (!bearipRequireLogin('my-dna.html')) return;
  const user = bearipGetUser();
  const ip = typeof bearipGetCurrentIP === 'function' ? bearipGetCurrentIP() : null;
  if (!ip) {
    bearipShowToast('먼저 IP를 만들거나 선택해주세요');
    return;
  }
  aiInjectStyles();

  const esc = bearipEscapeHtml;
  const root = document.querySelector('.dna-app, .od-app, .cr-app, .lg-app, .ni-app') || document.body;
  const overlay = document.createElement('div');
  overlay.id = 'aiAssistOverlay';
  overlay.className = 'bearip-report-overlay';
  overlay.innerHTML = '<div class="bearip-report-box bearip-ai-box" role="dialog" aria-label="AI 시나리오 도움받기"></div>';
  const box = overlay.firstElementChild;
  root.appendChild(overlay);

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  const head = (sub) => `
    <h3>AI 시나리오 도움받기</h3>
    <div class="rp-sub">'${esc(ip.title || '제목 없는 IP')}'${sub ? ' · ' + esc(sub) : ''}</div>
    <div class="ai-tiers">
      <button type="button" class="ai-tier active">무료 · Gemma 4</button>
      <button type="button" class="ai-tier" data-soon="1">고급 AI · 구현 중</button>
    </div>`;
  const wireTiers = () =>
    box.querySelectorAll('.ai-tier[data-soon]').forEach((b) =>
      b.addEventListener('click', () => bearipShowToast('고급 AI(Claude·GPT 등)는 구현 중이에요'))
    );

  function renderLoading() {
    box.innerHTML = head('') + '<div class="ai-loading">불러오는 중이에요...</div>';
    wireTiers();
  }

  function renderProblem(message, canRetry) {
    box.innerHTML =
      head('') +
      `<div class="rp-text">${esc(message)}</div>
       <div class="rp-actions">${canRetry ? '<button type="button" class="ai-retry">다시 시도</button>' : ''}<button type="button" class="ai-close">닫기</button></div>`;
    wireTiers();
    box.querySelector('.ai-close').addEventListener('click', close);
    const retry = box.querySelector('.ai-retry');
    if (retry) retry.addEventListener('click', start);
  }

  function renderConsent() {
    box.innerHTML =
      head('') +
      `<div class="rp-text"><b>잠깐, 먼저 확인해주세요.</b><br>
        무료 AI(Gemma 4)는 구글의 무료 서비스로 동작해요. 내 IP 정보와 질문이 <b>구글로 전송되고, 구글의 서비스 개선에 사용될 수 있어요.</b>
        공개하고 싶지 않은 내용이나 개인정보는 넣지 마세요. 이 조건이 싫다면 나중에 제공될 고급 AI(구현 중)를 이용해주세요.</div>
       <div class="ai-error" id="aiConsentError"></div>
       <div class="rp-actions"><button type="button" class="ai-close">취소</button><button type="button" class="rp-submit" id="aiConsentBtn">동의하고 시작</button></div>`;
    wireTiers();
    box.querySelector('.ai-close').addEventListener('click', close);
    box.querySelector('#aiConsentBtn').addEventListener('click', async (e) => {
      e.target.disabled = true;
      try {
        await bearipAiCall('assist', { action: 'consent', nickname: user.nickname });
        start();
      } catch (err) {
        e.target.disabled = false;
        box.querySelector('#aiConsentError').textContent = err.message;
      }
    });
  }

  function renderMain(remaining, presetText) {
    const quick = AI_QUICK_QUESTIONS.map((q) => `<button type="button" data-q="${bearipEscapeAttr(q)}">${esc(q)}</button>`).join('');
    box.innerHTML =
      head(`오늘 ${remaining}회 남았어요`) +
      `<textarea id="aiQuestion" maxlength="1000" placeholder="무엇이 궁금한가요? 예) 주인공의 약점을 더 입체적으로 만들고 싶어요"></textarea>
       <div class="ai-quick">${quick}</div>
       <div class="ai-error" id="aiError"></div>
       <div id="aiResult"></div>
       <div class="rp-actions" style="margin-top:14px">
         <button type="button" class="ai-close">닫기</button>
         <button type="button" class="rp-submit" id="aiSend">질문하기</button>
       </div>
       <div class="ai-foot"><span>답변은 참고용이에요. 내용은 직접 확인하고 다듬어주세요.</span><button type="button" id="aiRevoke">동의 철회</button></div>`;
    wireTiers();
    const textarea = box.querySelector('#aiQuestion');
    if (presetText) textarea.value = presetText;
    box.querySelector('.ai-close').addEventListener('click', close);
    box.querySelectorAll('.ai-quick button').forEach((b) =>
      b.addEventListener('click', () => {
        textarea.value = b.dataset.q;
        textarea.focus();
      })
    );
    const errorEl = box.querySelector('#aiError');
    const resultEl = box.querySelector('#aiResult');
    const sendBtn = box.querySelector('#aiSend');

    sendBtn.addEventListener('click', async () => {
      const question = textarea.value.trim();
      errorEl.textContent = '';
      if (question.length < 2) {
        errorEl.textContent = '질문을 입력해주세요.';
        textarea.focus();
        return;
      }
      sendBtn.disabled = true;
      sendBtn.textContent = '생각하는 중...';
      try {
        const data = await bearipAiCall('assist', { action: 'ask', question, ip: aiBuildIpPayload(bearipGetCurrentIP() || ip) });
        resultEl.innerHTML = `<div class="ai-answer">${aiFormatAnswer(data.answer)}</div>
          <div class="ai-foot"><span>오늘 ${data.remaining}회 남았어요</span><button type="button" id="aiCopy">답변 복사</button></div>`;
        box.querySelector('.rp-sub').textContent = `'${ip.title || '제목 없는 IP'}' · 오늘 ${data.remaining}회 남았어요`;
        box.querySelector('#aiCopy').addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(data.answer);
            bearipShowToast('답변을 복사했어요');
          } catch (e) {
            bearipShowToast('복사하지 못했어요. 직접 선택해서 복사해주세요');
          }
        });
      } catch (err) {
        errorEl.textContent = err.message;
        if (err.code === 'consent_required') renderConsent();
      } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = '질문하기';
      }
    });

    box.querySelector('#aiRevoke').addEventListener('click', async () => {
      if (!confirm('동의를 철회할까요? 다시 쓰려면 동의 화면을 거쳐야 해요.')) return;
      try {
        await bearipAiCall('assist', { action: 'revoke' });
        close();
        bearipShowToast('동의를 철회했어요');
      } catch (err) {
        errorEl.textContent = err.message;
      }
    });
  }

  async function start() {
    renderLoading();
    try {
      const status = await bearipAiCall('assist', { action: 'status' });
      if (!status.enabled) {
        renderProblem('AI 기능이 잠시 꺼져 있어요. 나중에 다시 이용해주세요.', false);
      } else if (!status.consent) {
        renderConsent();
      } else {
        renderMain(status.remaining, opts && opts.preset ? AI_PRESETS[opts.preset] || '' : '');
      }
    } catch (err) {
      renderProblem(err.message, err.code !== 'not_configured');
    }
  }
  start();
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('aiScenarioBtn');
  if (btn) btn.addEventListener('click', () => bearipOpenAiAssist());
});
