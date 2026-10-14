const NT_ICONS = {
  crew: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3.4"/><path d="M1.6 20c0-3.8 2.9-6.2 6.4-6.2S14.4 16.2 14.4 20"/><circle cx="17" cy="9" r="2.6"/><path d="M14.6 13.6c2.6.3 4.4 2.3 5.3 4.1"/></svg>',
  ip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 3C8 3 16 6 16 12C16 18 8 21 8 21"/><path d="M16 3C16 3 8 6 8 12C8 18 16 21 16 21"/><path d="M9 7h6M8 12h8M9 17h6"/></svg>',
  discussion: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 01-8.9 8.4 8.6 8.6 0 01-3.8-.9L3 20l1.1-5A8.4 8.4 0 1121 11.5z"/></svg>',
  system: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z"/></svg>',
  dm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
};

function ntFormatTime(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

function ntRender() {
  const list = document.getElementById('ntList');
  const items = bearipLoadNotifications();
  list.innerHTML = '';

  if (items.length === 0) {
    list.innerHTML = `
      <div class="nt-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>
        <div class="t">아직 알림이 없어요</div>
        <div class="s">지원 결과나 크루 소식이 오면 여기에 표시돼요.</div>
      </div>
    `;
    return;
  }

  items.forEach((n) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'nt-item' + (n.read ? '' : ' unread');
    el.innerHTML = `
      <div class="nt-icon type-${n.type}">${NT_ICONS[n.type] || NT_ICONS.system}</div>
      <div class="nt-body">
        <div class="nt-top-row">
          <div class="nt-title">${n.title}</div>
          <div class="nt-time">${ntFormatTime(n.createdAt)}</div>
        </div>
        <div class="nt-message">${n.message}</div>
      </div>
      ${n.read ? '' : '<span class="nt-unread-dot"></span>'}
    `;
    el.addEventListener('click', () => {
      bearipMarkNotificationRead(n.id);
      if (n.link) location.href = n.link;
      else ntRender();
    });
    list.appendChild(el);
  });
}

// ---- 폰 알림 켜기/끄기 카드 (app-boot.js의 bearipPush 사용) ----
async function ntPushRender() {
  const card = document.getElementById('ntPush');
  if (!card || !window.bearipPush) return;
  const state = await window.bearipPush.state().catch(() => 'unsupported');
  const title = document.getElementById('ntPushTitle');
  const sub = document.getElementById('ntPushSub');
  const btn = document.getElementById('ntPushBtn');
  btn.disabled = false;
  btn.classList.remove('quiet');
  btn.style.display = '';
  card.style.display = state === 'unsupported' ? 'none' : 'flex';
  btn.dataset.state = state;
  if (state === 'off') {
    title.textContent = '결과가 나오면 폰으로 알려드릴까요?';
    sub.textContent = '의뢰 결과나 쪽지가 도착하면 앱을 열지 않아도 알림이 와요. 이 기기에서만 켜져요.';
    btn.textContent = '알림 켜기';
  } else if (state === 'on') {
    title.textContent = '이 기기로 알림을 받고 있어요';
    sub.textContent = '의뢰 결과나 쪽지가 도착하면 폰에 알림이 떠요.';
    btn.textContent = '끄기';
    btn.classList.add('quiet');
  } else if (state === 'denied') {
    title.textContent = '이 기기에서 알림이 막혀 있어요';
    sub.textContent = '브라우저(또는 휴대폰) 설정에서 Thinkit의 알림을 허용하면 켤 수 있어요.';
    btn.style.display = 'none';
  } else if (state === 'install') {
    title.textContent = '홈 화면에 추가하면 폰 알림을 받을 수 있어요';
    sub.textContent = 'Safari 아래쪽의 공유 버튼(네모에 위 화살표)을 누르고 "홈 화면에 추가"를 선택한 뒤, 추가된 Thinkit 앱에서 다시 열어주세요.';
    btn.style.display = 'none';
  }
}

function ntPushInit() {
  const btn = document.getElementById('ntPushBtn');
  if (!btn) return;
  ntPushRender();
  btn.addEventListener('click', async () => {
    const state = btn.dataset.state;
    btn.disabled = true;
    try {
      if (state === 'off') {
        const r = await window.bearipPush.enable();
        if (r.ok) bearipShowToast('이 기기로 알림을 보내드릴게요');
        else if (r.reason === 'denied') bearipShowToast('알림이 차단됐어요. 설정에서 허용해주세요');
        else if (r.reason !== 'dismissed') bearipShowToast('알림을 켜지 못했어요. 잠시 후 다시 시도해주세요');
      } else if (state === 'on') {
        await window.bearipPush.disable();
        bearipShowToast('이 기기의 알림을 껐어요');
      }
    } catch (e) {
      bearipShowToast('알림을 바꾸지 못했어요. 잠시 후 다시 시도해주세요');
    }
    ntPushRender();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Render in whichever shell (light shell / dark CONTENT ROOM) the user
  // was just browsing in, since this page is reachable from either.
  if (sessionStorage.getItem('bearip_shell_theme') === 'dark') {
    document.getElementById('ntRoot').classList.add('theme-dark');
  }

  ntRender();
  if (typeof bearipOnDataChange === 'function') bearipOnDataChange('notifications', ntRender);

  ntPushInit();

  document.getElementById('ntReadAllBtn').addEventListener('click', () => {
    bearipMarkAllNotificationsRead();
    ntRender();
  });
});
