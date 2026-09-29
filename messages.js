// 쪽지함 — 1:1 DM inbox + thread view. Real Firebase data (storage.js's
// dmThreads functions), not a mockup: messages reach the other person's
// device even though they have no local copy of anything from this browser.

const MSG_THUMBS = ['thumb-1', 'thumb-2', 'thumb-3', 'thumb-4', 'thumb-5', 'thumb-6', 'thumb-7', 'thumb-8'];
function msgThumbFor(name) {
  let sum = 0;
  for (let i = 0; i < (name || '').length; i++) sum += name.charCodeAt(i);
  return MSG_THUMBS[sum % MSG_THUMBS.length];
}

function msgFormatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (sameDay) return hm;
  return `${d.getMonth() + 1}.${d.getDate()} ${hm}`;
}

// Active thread state — a "new" conversation (started via the nickname input
// or a 쪽지 보내기 button elsewhere) has otherNickname set but no threadId
// yet, since dmThreads/<id> isn't created until the first message actually
// sends (bearipSendDm writes participants + the message together).
let msgActiveOther = null;

function msgThreadIdFor(other) {
  const user = bearipGetUser();
  if (!user || !other) return null;
  return bearipDmThreadId(user.nickname, other);
}

function msgRenderThreadList() {
  const list = document.getElementById('msgThreadList');
  const empty = document.getElementById('msgThreadEmpty');
  if (!list || typeof bearipLoadMyDmThreads !== 'function') return;
  const esc = bearipEscapeHtml;
  const threads = bearipLoadMyDmThreads();

  empty.style.display = threads.length ? 'none' : '';
  list.innerHTML = threads
    .map(
      (t) => `
      <div class="msg-thread-row${t.otherNickname === msgActiveOther ? ' active' : ''}" data-nickname="${esc(t.otherNickname)}">
        <div class="msg-thread-avatar ${msgThumbFor(t.otherNickname)}"></div>
        <div class="msg-thread-info">
          <div class="msg-thread-name">${esc(t.otherNickname)}${t.unread ? '<span class="msg-thread-dot"></span>' : ''}</div>
          <div class="msg-thread-preview">${esc(t.lastMessage || '')}</div>
        </div>
      </div>
    `
    )
    .join('');

  list.querySelectorAll('.msg-thread-row').forEach((row) => {
    row.addEventListener('click', () => msgOpenThread(row.dataset.nickname));
  });
}

function msgRenderMessages() {
  const listEl = document.getElementById('msgList');
  if (!listEl || !msgActiveOther) return;
  const user = bearipGetUser();
  const threadId = msgThreadIdFor(msgActiveOther);
  const messages = threadId ? bearipGetDmThreadMessages(threadId) : [];
  const esc = bearipEscapeHtml;

  listEl.innerHTML = messages
    .map(
      (m) => `
      <div class="msg-bubble-row${m.from === user.nickname ? ' mine' : ''}">
        <div>
          <div class="msg-bubble">${esc(m.text)}</div>
          <div class="msg-bubble-time">${msgFormatTime(m.createdAt)}</div>
        </div>
      </div>
    `
    )
    .join('') || '<div class="msg-thread-empty">아직 메시지가 없어요. 첫 메시지를 보내보세요.</div>';
  listEl.scrollTop = listEl.scrollHeight;
}

function msgOpenThread(otherNickname) {
  if (!otherNickname) return;
  msgActiveOther = otherNickname;
  const threadId = msgThreadIdFor(otherNickname);
  if (threadId && typeof bearipMarkDmThreadRead === 'function') bearipMarkDmThreadRead(threadId);

  document.getElementById('msgPanelEmpty').style.display = 'none';
  document.getElementById('msgPanel').style.display = 'flex';
  document.getElementById('msgPanelAvatar').className = `msg-panel-avatar ${msgThumbFor(otherNickname)}`;
  document.getElementById('msgPanelName').textContent = otherNickname;

  msgRenderMessages();
  msgRenderThreadList();
}

function msgSend() {
  const input = document.getElementById('msgComposerInput');
  const text = input.value.trim();
  if (!text || !msgActiveOther) return;
  bearipSendDm(msgActiveOther, text);
  input.value = '';
  msgRenderMessages();
  msgRenderThreadList();
}

document.addEventListener('DOMContentLoaded', () => {
  if (!bearipRequireLogin('messages.html')) return;

  msgRenderThreadList();

  document.getElementById('msgNewBtn').addEventListener('click', () => {
    const input = document.getElementById('msgNewNickname');
    const nickname = input.value.trim();
    const me = bearipGetUser();
    if (!nickname) {
      input.focus();
      return;
    }
    if (me && nickname === me.nickname) {
      bearipShowToast('자기 자신에게는 쪽지를 보낼 수 없어요');
      return;
    }
    input.value = '';
    msgOpenThread(nickname);
  });
  document.getElementById('msgNewNickname').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('msgNewBtn').click();
  });

  document.getElementById('msgSendBtn').addEventListener('click', msgSend);
  document.getElementById('msgComposerInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') msgSend();
  });

  // Entry point from elsewhere (crew-match.html's 쪽지 보내기, ip-detail.html's
  // 제작자 panel) — same one-shot sessionStorage handoff pattern this app
  // already uses for cross-page IP snapshots.
  const openWith = sessionStorage.getItem('bearip_dm_open_with');
  sessionStorage.removeItem('bearip_dm_open_with');
  if (openWith) msgOpenThread(openWith);

  if (typeof bearipOnDataChange === 'function') {
    bearipOnDataChange('dmThreads', () => {
      msgRenderThreadList();
      if (msgActiveOther) msgRenderMessages();
    });
  }
});
