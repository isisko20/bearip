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
  const blocked = bearipIsBlocked(msgActiveOther);
  const messages = threadId && !blocked ? bearipGetDmThreadMessages(threadId) : [];
  const esc = bearipEscapeHtml;

  // 차단한 상대는 지난 대화도 보여주지 않고 입력창도 막아요 — 해제하면 그대로 돌아와요.
  document.querySelector('.msg-composer').style.display = blocked ? 'none' : '';
  const blockBtn = document.getElementById('msgBlockBtn');
  blockBtn.textContent = blocked ? '차단 해제' : '차단';
  blockBtn.classList.toggle('is-blocked', blocked);

  if (blocked) {
    listEl.innerHTML = '<div class="msg-thread-empty">차단한 사용자예요. 차단을 해제하면 다시 대화할 수 있어요.</div>';
    return;
  }

  listEl.innerHTML = messages
    .map((m) => {
      const mine = m.from === user.nickname;
      const msgId = bearipEscapeAttr(m.id);
      const reportBtn = mine
        ? `<button type="button" class="bearip-delete-link" data-msg-id="${msgId}">삭제</button>`
        : `<button type="button" class="bearip-report-link" data-msg-id="${msgId}">신고</button>`;
      return `
      <div class="msg-bubble-row${mine ? ' mine' : ''}">
        <div>
          <div class="msg-bubble">${esc(m.text)}</div>
          <div class="msg-bubble-time">${msgFormatTime(m.createdAt)}${reportBtn}</div>
        </div>
      </div>
    `;
    })
    .join('') || '<div class="msg-thread-empty">아직 메시지가 없어요. 첫 메시지를 보내보세요.</div>';
  listEl.scrollTop = listEl.scrollHeight;
}

// 차단한 사용자 목록 — 차단하면 쪽지 목록에서도 사라지므로, 해제할 수 있는
// 진입점이 따로 필요해요.
function msgRenderBlocked() {
  const box = document.getElementById('msgBlocked');
  const listEl = document.getElementById('msgBlockedList');
  if (!box || !listEl) return;
  const names = bearipBlockedUsers();
  box.style.display = names.length ? '' : 'none';
  document.getElementById('msgBlockedCount').textContent = names.length;
  if (!names.length) listEl.hidden = true;
  listEl.innerHTML = names
    .map(
      (n) => `<div class="msg-blocked-row"><span>${bearipEscapeHtml(n)}</span><button type="button" data-nickname="${bearipEscapeAttr(n)}">해제</button></div>`
    )
    .join('');
}

function msgCloseThread() {
  msgActiveOther = null;
  document.getElementById('msgPanel').style.display = 'none';
  document.getElementById('msgPanelEmpty').style.display = '';
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
  if (!text || !msgActiveOther || bearipIsBlocked(msgActiveOther)) return;
  bearipSendDm(msgActiveOther, text);
  input.value = '';
  msgRenderMessages();
  msgRenderThreadList();
}

document.addEventListener('DOMContentLoaded', () => {
  if (!bearipRequireLogin('messages.html')) return;

  msgRenderThreadList();
  msgRenderBlocked();

  // 상대 메시지 신고 — 신고 시점의 글 내용을 그대로 담아 보내요.
  document.getElementById('msgList').addEventListener('click', (e) => {
    const delBtn = e.target.closest('.bearip-delete-link');
    if (delBtn && msgActiveOther) {
      if (!confirm('이 쪽지를 삭제할까요?\n상대방 화면에서도 사라져요.')) return;
      if (bearipDeleteOwnDmMessage(msgThreadIdFor(msgActiveOther), delBtn.dataset.msgId)) {
        msgRenderMessages();
        msgRenderThreadList();
        bearipShowToast('쪽지를 삭제했어요');
      }
      return;
    }
    const btn = e.target.closest('.bearip-report-link');
    if (!btn || !msgActiveOther) return;
    const msg = bearipGetDmThreadMessages(msgThreadIdFor(msgActiveOther)).find((m) => m.id === btn.dataset.msgId);
    if (!msg) return;
    bearipOpenReportModal({
      type: 'dm',
      targetNickname: msg.from,
      targetId: msg.id,
      text: msg.text,
      contextLabel: '쪽지',
      onDone: () => {
        // 신고하면서 차단까지 했다면 이 대화를 바로 닫아요.
        if (msgActiveOther && bearipIsBlocked(msgActiveOther)) msgCloseThread();
        msgRenderThreadList();
        msgRenderBlocked();
      },
    });
  });

  document.getElementById('msgBlockBtn').addEventListener('click', () => {
    if (!msgActiveOther) return;
    if (bearipIsBlocked(msgActiveOther)) {
      bearipUnblockUser(msgActiveOther);
      bearipShowToast(`${msgActiveOther}님 차단을 해제했어요`);
      msgRenderMessages();
    } else {
      if (!confirm(`${msgActiveOther}님을 차단할까요?\n이 사람의 쪽지·댓글·크루 채팅이 내 화면에서 사라져요. 상대에게는 알려지지 않아요.`)) return;
      bearipBlockUser(msgActiveOther);
      bearipShowToast(`${msgActiveOther}님을 차단했어요`);
      msgCloseThread();
    }
    msgRenderThreadList();
    msgRenderBlocked();
  });

  document.getElementById('msgBlockedToggle').addEventListener('click', () => {
    const listEl = document.getElementById('msgBlockedList');
    listEl.hidden = !listEl.hidden;
  });
  document.getElementById('msgBlockedList').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-nickname]');
    if (!btn) return;
    bearipUnblockUser(btn.dataset.nickname);
    bearipShowToast(`${btn.dataset.nickname}님 차단을 해제했어요`);
    msgRenderBlocked();
    msgRenderThreadList();
    if (msgActiveOther) msgRenderMessages();
  });

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
