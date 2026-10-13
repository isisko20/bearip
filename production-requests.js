// "제작요청 관리" — lets whoever's fulfilling requests (GM) see every
// 제작요청 across every IP/creator and move it to 완료 (done) or 거절
// (rejected, refunded) — closing the loop MY DNA's own 제작요청 tab left open
// at "검토 대기". Now backed by Firebase (see storage.js) so this is genuinely
// every creator's requests, not just requests made from this same browser —
// gated to GM the same way ip-reviews.js is, so a regular creator can't
// browse into (and act on) other people's requests.
const PR_STATUS_LABEL = { pending: '검토 대기', done: '완료', cancelled: '취소됨', rejected: '거절됨' };

function prIsGm() {
  const user = typeof bearipGetUser === 'function' ? bearipGetUser() : null;
  return !!(user && user.nickname === 'GM');
}

function prShowGmLocked() {
  const filterRow = document.getElementById('prFilterRow');
  const list = document.getElementById('prList');
  const empty = document.getElementById('prEmpty');
  const locked = document.getElementById('prGmLocked');
  const cleanup = document.getElementById('prCleanupPanel');
  const reportPanel = document.getElementById('prReportPanel');
  if (reportPanel) reportPanel.style.display = 'none';
  const aiPanel = document.getElementById('prAiPanel');
  if (aiPanel) aiPanel.style.display = 'none';
  const errorPanel = document.getElementById('prErrorPanel');
  if (errorPanel) errorPanel.style.display = 'none';
  const acctPanel = document.getElementById('prAcctPanel');
  if (acctPanel) acctPanel.style.display = 'none';
  const invitePanel = document.getElementById('prInvitePanel');
  if (invitePanel) invitePanel.style.display = 'none';
  if (filterRow) filterRow.style.display = 'none';
  if (list) list.style.display = 'none';
  if (empty) empty.style.display = 'none';
  if (cleanup) cleanup.style.display = 'none';
  if (locked) locked.style.display = 'flex';
  const loginBtn = document.getElementById('prGmLoginBtn');
  if (loginBtn) loginBtn.addEventListener('click', () => bearipGoToLogin('production-requests.html'));
}

// 고아 데이터 점검 — a manual, GM-only sweep for records still referencing an
// IP that's since been deleted (bearipScanOrphans/bearipCleanupOrphans, both
// in storage.js). Kept a deliberate two-step scan-then-confirm instead of a
// silent background job, since this deletes real data and the count is worth
// a look before it's gone.
const PR_ORPHAN_LABEL = {
  ipOverallComments: '종합 코멘트',
  productionRequests: '제작요청',
  ipReviews: '전문가 검토',
  positions: '모집글',
  ipJoinRequests: 'IP 참여 신청',
  ipFollowers: '팔로워',
  positionApplicants: '지원자 목록',
  episodeLikes: '회차 좋아요',
  episodeComments: '회차 댓글',
  episodeViews: '회차 조회수',
  ipViews: 'IP 조회수',
  crewChat: '크루 채팅',
  ipCheers: 'IP 응원',
};

function prRenderCleanupResult(report) {
  const resultEl = document.getElementById('prCleanupResult');
  if (!resultEl) return;
  const total = bearipOrphanCount(report);
  resultEl.hidden = false;

  if (total === 0) {
    resultEl.innerHTML = '<div class="pr-cleanup-clean">고아 데이터가 없어요. 깨끗해요.</div>';
    return;
  }

  const rows = Object.keys(report)
    .filter((key) => report[key].length)
    .map((key) => `<div class="pr-cleanup-row"><span class="k">${PR_ORPHAN_LABEL[key] || key}</span><span class="v">${report[key].length}건</span></div>`)
    .join('');
  resultEl.innerHTML = `
    <div class="pr-cleanup-summary">삭제된 IP를 참조하는 데이터 ${total}건을 찾았어요.</div>
    ${rows}
    <button type="button" class="pr-cleanup-purge-btn" id="prCleanupPurgeBtn">전부 정리하기</button>
  `;
  document.getElementById('prCleanupPurgeBtn').addEventListener('click', () => prConfirmCleanup(report));
}

// Same custom-overlay pattern prConfirmPurge above uses instead of a native
// confirm() (can be blocked outright in this prototype's embedded contexts).
function prConfirmCleanup(report) {
  const total = bearipOrphanCount(report);
  const overlay = document.createElement('div');
  overlay.className = 'pr-confirm-overlay';
  overlay.innerHTML = `
    <div class="pr-confirm-box">
      <div class="pr-confirm-title">${total}건을 정리할까요?</div>
      <div class="pr-confirm-desc">삭제된 IP를 참조하던 데이터예요. 되돌릴 수 없어요.</div>
      <div class="pr-confirm-actions">
        <button type="button" class="pr-confirm-cancel">취소</button>
        <button type="button" class="pr-confirm-submit reject">정리하기</button>
      </div>
    </div>
  `;
  (document.querySelector('.dna-app') || document.body).appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('.pr-confirm-cancel').addEventListener('click', close);
  overlay.querySelector('.pr-confirm-submit').addEventListener('click', () => {
    close();
    bearipCleanupOrphans(report);
    bearipShowToast(`${total}건 정리했어요`);
    document.getElementById('prCleanupResult').hidden = true;
  });
}

function prFormatRelativeTime(iso) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

// 신고 접수 — 쪽지/크루 채팅/댓글 신고(reports, storage.js). 처리 대기 건이
// 위로, 처리 완료는 흐리게 아래로. 처리하면 "처리 완료", 기록이 필요 없으면 삭제.
const PR_REPORT_TYPE_LABEL = { dm: '쪽지', crew: '크루 채팅', comment: '댓글' };

function prRenderReports() {
  const panel = document.getElementById('prReportPanel');
  const listEl = document.getElementById('prReportList');
  if (!panel || !listEl || typeof bearipLoadReports !== 'function') return;
  const reports = bearipLoadReports().sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1));
  const openCount = reports.filter((r) => r.status === 'open').length;
  document.getElementById('prReportOpenCount').textContent = openCount ? `· 처리 대기 ${openCount}건` : '';

  if (!reports.length) {
    const loading = typeof bearipIsDataLoaded === 'function' && !bearipIsDataLoaded('reports');
    listEl.innerHTML = `<div class="pr-report-empty">${loading ? '불러오는 중이에요...' : '접수된 신고가 없어요.'}</div>`;
    return;
  }
  const esc = bearipEscapeHtml;
  listEl.innerHTML = reports
    .map(
      (r) => `
    <div class="pr-report-row${r.status === 'open' ? '' : ' resolved'}">
      <div class="pr-report-top">
        <span class="pr-report-who"><b>${esc(r.reporter)}</b> → <b>${esc(r.targetNickname)}</b></span>
        <span class="pr-report-type">${esc(PR_REPORT_TYPE_LABEL[r.type] || r.type)} · ${esc(r.reason)}</span>
        <span class="pr-report-time">${prFormatRelativeTime(r.createdAt)}</span>
      </div>
      <div class="pr-report-ctx">${esc(r.contextLabel || '')}</div>
      <div class="pr-report-text">"${esc(r.text || '')}"</div>
      ${r.note ? `<div class="pr-report-note">신고 메모: ${esc(r.note)}</div>` : ''}
      <div class="pr-report-actions">
        ${r.status === 'open' ? `<button type="button" data-act="resolve" data-id="${bearipEscapeAttr(r.id)}">처리 완료</button>` : '<span class="pr-report-done">처리됨</span>'}
        <button type="button" data-act="delete" data-id="${bearipEscapeAttr(r.id)}">삭제</button>
      </div>
    </div>
  `
    )
    .join('');
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('#prReportList button[data-act]');
  if (!btn) return;
  if (btn.dataset.act === 'resolve') {
    bearipResolveReport(btn.dataset.id);
    bearipShowToast('처리 완료로 표시했어요');
  } else {
    if (!confirm('이 신고 기록을 삭제할까요?')) return;
    bearipDeleteReport(btn.dataset.id);
    bearipShowToast('신고 기록을 삭제했어요');
  }
});

// AI 시나리오 도우미 설정 — 서버(aiAdmin)가 GM PIN을 직접 확인하므로 화면에서
// GM인 척해도 바꿀 수 없어요. PIN은 저장하지 않고 요청 한 번에만 실어 보내요.
function prAiRender(data) {
  document.getElementById('prAiEnabled').checked = !!data.config.enabled;
  document.getElementById('prAiPerUser').value = data.config.dailyPerUser;
  document.getElementById('prAiGlobal').value = data.config.globalDaily;
  document.getElementById('prAiTriageEnabled').checked = data.config.triageEnabled !== false;
  document.getElementById('prAiTriageDaily').value = data.config.triageDaily == null ? 100 : data.config.triageDaily;
  document.getElementById('prAiState').textContent = `· ${data.config.enabled ? '켜짐' : '꺼짐'} · 오늘 ${data.usedToday}/${data.config.globalDaily}회 사용 · 의뢰 자동 처리 ${data.config.triageEnabled === false ? '꺼짐' : '켜짐'} ${data.triageUsedToday || 0}/${data.config.triageDaily == null ? 100 : data.config.triageDaily}건 · ${data.model}`;
}

async function prAiRequest(action) {
  const msg = document.getElementById('prAiMsg');
  const pinInput = document.getElementById('prAiPin');
  if (!pinInput.value) {
    msg.textContent = 'GM PIN을 입력해주세요.';
    pinInput.focus();
    return;
  }
  msg.textContent = '확인 중...';
  const body = { action, pin: pinInput.value };
  if (action === 'set') {
    body.enabled = document.getElementById('prAiEnabled').checked;
    body.dailyPerUser = Number(document.getElementById('prAiPerUser').value);
    body.globalDaily = Number(document.getElementById('prAiGlobal').value);
    body.triageEnabled = document.getElementById('prAiTriageEnabled').checked;
    body.triageDaily = Number(document.getElementById('prAiTriageDaily').value);
  }
  try {
    const data = await bearipAiCall('admin', body);
    prAiRender(data);
    msg.textContent = action === 'set' ? '저장했어요.' : '불러왔어요.';
  } catch (e) {
    msg.textContent = e.message;
  } finally {
    pinInput.value = '';
  }
}

// 친구 안내문 — 안내 페이지(welcome.html) 링크가 들어간 카톡용 문구. 주소는 지금 열린 사이트 기준으로 만들어요.
function prInviteUrl() {
  return new URL('welcome.html', location.href).href;
}

function prInviteTexts() {
  const url = prInviteUrl();
  return {
    prInviteNew: [
      'Thinkit에 초대해요 🙂',
      '친구들과 아이디어를 IP로 같이 키우는 공간이에요.',
      '',
      '👉 ' + url,
      '',
      '1) 링크를 크롬(안드로이드)이나 사파리(아이폰)로 열어서 "앱으로 설치"',
      '2) 닉네임 + PIN(4자 이상) 만들기 — PIN은 잊어버리면 못 찾으니 꼭 기억해 주세요',
      '3) MY DNA 개발 맵에서 "업로드" → 빠진 항목 확인 → 100%가 되면 "분석하기"(무료)',
      '',
      '※ 카톡 안에서 열면 설치가 안 돼요. 오른쪽 아래 ⋮ → "다른 브라우저로 열기"를 눌러 주세요.',
    ].join('\n'),
    prInviteOld: [
      'Thinkit 업데이트 안내예요 🙂',
      '',
      '1) 내 닉네임을 PIN으로 잠가 주세요 — 앱에 들어가면 뜨는 안내 창에서 설정하면 돼요. (다른 사람이 내 작품을 고치지 못하게 지켜줘요. PIN은 잊어버리면 못 찾으니 꼭 기억해 주세요)',
      '2) 개발 맵이 바뀌었어요: 업로드하면 빠진 항목을 알려주고, 100%가 되면 "분석하기"(무료)로 준비도를 볼 수 있어요. 개발 맵 제목 옆 "사용법"을 눌러보세요.',
      '3) 앱처럼 설치할 수도 있어요 (홈 화면에 아이콘)',
      '',
      '👉 자세한 안내: ' + url,
    ].join('\n'),
  };
}

function prWireInvite() {
  const texts = prInviteTexts();
  Object.keys(texts).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = texts[id];
  });
  document.getElementById('prInvitePanel').addEventListener('click', async (e) => {
    const copyBtn = e.target.closest('[data-copy]');
    if (copyBtn) {
      const el = document.getElementById(copyBtn.dataset.copy);
      try {
        await navigator.clipboard.writeText(el.value);
        bearipShowToast('복사했어요. 카톡에 붙여넣어 보내세요');
      } catch (err) {
        el.select();
        bearipShowToast('자동 복사가 안 돼서 문구를 선택해 뒀어요. 길게 눌러 복사해 주세요');
      }
      return;
    }
    if (e.target.closest('#prInviteOpen')) window.open(prInviteUrl(), '_blank', 'noopener');
  });
}

// 대기 중인 의뢰가 얼마나 오래 기다렸는지 — 하루 이상이면 일수를, 일주일이 넘으면 주황색으로 보여줘요.
function prAgeBadgeHtml(r) {
  if (r.status !== 'pending' || !r.requestedAt) return '';
  const days = Math.floor((Date.now() - new Date(r.requestedAt).getTime()) / 86400000);
  if (!(days >= 1)) return '<span class="pr-age">오늘 접수</span>';
  return `<span class="pr-age${days >= 7 ? ' old' : ''}">${days}일째 대기</span>`;
}

function prPendingSummaryHtml(rows) {
  if (prActiveFilter !== 'pending' || !rows.length) return '';
  const oldest = rows.reduce((a, b) => (new Date(a.requestedAt) < new Date(b.requestedAt) ? a : b));
  const days = Math.max(0, Math.floor((Date.now() - new Date(oldest.requestedAt).getTime()) / 86400000));
  const stale = rows.filter((r) => Date.now() - new Date(r.requestedAt).getTime() >= 7 * 86400000).length;
  return `<div class="pr-pending-summary">대기 중 <b>${rows.length}건</b> · 가장 오래된 의뢰는 <b>${days}일째</b>예요${stale ? ` · 일주일 넘게 기다린 의뢰 <b>${stale}건</b>` : ''} (오래된 순으로 보여줘요)</div>`;
}

// 자동 처리가 생기기 전에 접수된 옛 의뢰를 서버의 1차 검토에 넘겨요 — 글로 처리할 수 있으면 결과를 바로 의뢰한
// 사람에게 전달하고, 어려우면 그대로 두고 "직접 확인 필요"로 표시해요 (어느 쪽이든 의뢰는 사라지지 않아요).
async function prTryAutoHandle(btn) {
  if (!confirm('이 의뢰를 자동 처리해 볼까요?\n글로 처리할 수 있으면 결과가 바로 의뢰한 분께 전달돼요. 어려우면 그대로 두고 직접 확인이 필요하다고 표시해요.')) return;
  btn.disabled = true;
  btn.textContent = '처리 중...';
  try {
    const data = await bearipAiCall('triage', { kind: 'production', id: btn.dataset.id });
    if (data.outcome === 'handled') bearipShowToast('자동 처리했어요. 결과는 카드에서 확인할 수 있어요');
    else if (data.outcome === 'handoff') bearipShowToast('글로 처리하기 어려워서 직접 확인이 필요하다고 표시했어요');
    else bearipShowToast('이미 처리했거나 처리 중인 의뢰예요');
  } catch (e) {
    bearipShowToast(e.message || '자동 처리하지 못했어요');
    btn.disabled = false;
    btn.textContent = '자동 처리 시도';
  }
}

// 계정 PIN 현황 — 소유자 전용 규칙을 켜기 전에 "모두 PIN이 있고 주인 없는 IP가 없는지" 확인해요.
// 서버(aiAdmin)가 GM PIN을 확인하고, 계정 기록은 닉네임과 "설정했는지"만 내려와요.
let prAcctState = null;

async function prAcctRequest(action, extra) {
  const msg = document.getElementById('prAcctMsg');
  const pinInput = document.getElementById('prAcctPin');
  if (!pinInput.value) {
    msg.textContent = 'GM PIN을 입력해주세요.';
    pinInput.focus();
    return null;
  }
  msg.textContent = '확인 중...';
  try {
    const data = await bearipAiCall('admin', Object.assign({ action, pin: pinInput.value }, extra || {}));
    msg.textContent = '';
    return data;
  } catch (e) {
    msg.textContent = e.message;
    return null;
  } finally {
    pinInput.value = '';
  }
}

function prAcctRender() {
  const state = prAcctState;
  const listEl = document.getElementById('prAcctList');
  const ownerlessEl = document.getElementById('prAcctOwnerless');
  const summaryEl = document.getElementById('prAcctSummary');
  const nudgeAll = document.getElementById('prAcctNudgeAll');
  if (!state) return;
  const esc = bearipEscapeHtml;
  const noPin = state.people.filter((p) => !p.hasPin);
  const ready = !noPin.length && !state.ownerless.length;
  summaryEl.textContent = ready ? '· 모두 준비됐어요 ✅' : `· PIN 없음 ${noPin.length}명 · 주인 없는 IP ${state.ownerless.length}개`;
  nudgeAll.disabled = !noPin.length;
  const DAY = 24 * 3600 * 1000;
  listEl.innerHTML = state.people
    .map((p) => {
      const recent = p.lastNudgeAt && Date.now() - p.lastNudgeAt < DAY;
      const action = p.hasPin
        ? ''
        : `<button type="button" data-nudge="${esc(p.nickname)}" ${recent ? 'disabled' : ''}>${recent ? '오늘 보냄' : '알림 보내기'}</button>`;
      return `<div class="pr-report-row"><div class="pr-report-top">
        <span class="pr-report-type">${esc(p.nickname)}</span>
        <span class="pr-report-who">IP ${p.ipCount}개</span>
        <span class="pr-report-time" style="color:${p.hasPin ? '#2fae6b' : '#d68a1c'};font-weight:700">${p.hasPin ? 'PIN 설정됨' : 'PIN 없음'}</span>
      </div>${action ? `<div class="pr-report-actions">${action}</div>` : ''}</div>`;
    })
    .join('');
  ownerlessEl.innerHTML = state.ownerless.length
    ? `<div class="pr-cleanup-head" style="margin-top:14px"><div class="t">주인 없는 IP</div><div class="s">옛 IP라 만든 사람이 기록돼 있지 않아요. 누구 것인지 정하면 그분만 고칠 수 있게 돼요.</div></div>` +
      state.ownerless
        .map(
          (ip) => `<div class="pr-report-row"><div class="pr-report-top"><span class="pr-report-type">${esc(ip.title)}</span></div>
          <div class="pr-report-actions"><select data-owner-select="${esc(ip.id)}">${state.people.map((p) => `<option value="${esc(p.nickname)}">${esc(p.nickname)}</option>`).join('')}</select>
          <button type="button" data-assign="${esc(ip.id)}">주인으로 지정</button></div></div>`
        )
        .join('')
    : '';
}

async function prAcctLoad() {
  const data = await prAcctRequest('accounts');
  if (!data) return;
  prAcctState = { people: data.people || [], ownerless: data.ownerless || [] };
  prAcctRender();
}

async function prAcctNudge(nicknames) {
  const data = await prAcctRequest('nudge', { nicknames });
  if (!data) return;
  const sent = data.results.filter((r) => r.status === 'sent').length;
  bearipShowToast(sent ? `${sent}명에게 알림을 보냈어요` : '새로 보낼 사람이 없었어요 (이미 설정했거나 오늘 보냈어요)');
  prAcctLoad_afterAction();
}

// 알림·지정 뒤에는 PIN이 지워져 있어서, 화면에 보이는 현황만 서버 응답대로 반영해요.
function prAcctLoad_afterAction() {
  document.getElementById('prAcctMsg').textContent = 'GM PIN을 다시 입력하고 "현황 불러오기"를 누르면 최신 상태가 보여요.';
}

async function prAcctAssign(ipId, nickname) {
  if (!confirm(`이 IP의 주인을 '${nickname}'(으)로 정할까요? 정한 뒤에는 되돌릴 수 없어요.`)) return;
  const data = await prAcctRequest('assignOwner', { ipId, nickname });
  if (!data) return;
  bearipShowToast(`'${data.nickname}'님의 IP로 지정했어요`);
  prAcctState.ownerless = prAcctState.ownerless.filter((ip) => ip.id !== ipId);
  const person = prAcctState.people.find((p) => p.nickname === data.nickname);
  if (person) person.ipCount++;
  prAcctRender();
}

// 앱 오류 기록 — app-boot.js가 친구들 화면에서 모은 오류(clientErrors)를 같은 오류끼리 묶어서
// 보여줘요. GM만 읽을 수 있어서(데이터베이스 규칙), PIN으로 본인 확인이 안 된 GM 세션이면
// 안내 문구가 떠요. 많이 쌓이지 않게 최근 300건만 읽어요.
const PR_ERROR_KIND_LABEL = { error: '스크립트 오류', rejection: '처리 안 된 오류', denied: '저장 거부(권한)', resource: '파일 불러오기 실패' };

function prGroupErrors(rows) {
  const groups = {};
  rows.forEach((r) => {
    const key = [r.kind, r.message, r.source || '', r.line || 0].join('|');
    const g = (groups[key] = groups[key] || { kind: r.kind, message: r.message, source: r.source, line: r.line, count: 0, last: '', pages: new Set(), nicks: new Set(), ids: [], stack: '', ua: '' });
    g.count++;
    g.ids.push(r.id);
    if ((r.createdAt || '') > g.last) {
      g.last = r.createdAt;
      g.ua = r.ua || '';
    }
    if (r.page) g.pages.add(r.page);
    if (r.nickname) g.nicks.add(r.nickname);
    if (r.stack && !g.stack) g.stack = r.stack;
  });
  return Object.values(groups).sort((a, b) => (b.last || '').localeCompare(a.last || ''));
}

async function prRenderErrors() {
  const listEl = document.getElementById('prErrorList');
  const countEl = document.getElementById('prErrorCount');
  if (!listEl) return;
  listEl.innerHTML = '<div class="pr-report-empty">불러오는 중이에요...</div>';
  let rows = [];
  try {
    await _bearipWhenFirebaseAuthed();
    const snap = await firebase.database().ref('clientErrors').orderByChild('createdAt').limitToLast(300).once('value');
    snap.forEach((child) => {
      rows.push(Object.assign({ id: child.key }, child.val()));
    });
  } catch (e) {
    countEl.textContent = '';
    listEl.innerHTML = '<div class="pr-report-empty">오류 기록을 읽을 수 없어요. GM PIN으로 본인 확인이 된 상태인지 확인해주세요.</div>';
    return;
  }
  const groups = prGroupErrors(rows);
  countEl.textContent = groups.length ? `· ${groups.length}종류, 최근 ${rows.length}건` : '';
  if (!groups.length) {
    listEl.innerHTML = '<div class="pr-report-empty">기록된 오류가 없어요. 👍</div>';
    return;
  }
  const esc = bearipEscapeHtml;
  listEl.innerHTML = groups
    .slice(0, 40)
    .map(
      (g, i) => `
    <div class="pr-report-row">
      <div class="pr-report-top">
        <span class="pr-report-type">${esc(PR_ERROR_KIND_LABEL[g.kind] || g.kind)}</span>
        <span class="pr-report-who"><b>${g.count}회</b>${g.nicks.size ? ' · ' + esc([...g.nicks].slice(0, 4).join(', ')) : ''}</span>
        <span class="pr-report-time">${g.last ? prFormatRelativeTime(g.last) : ''}</span>
      </div>
      <div class="pr-report-text">${esc(g.message)}</div>
      <div class="pr-report-ctx">${esc(g.source || '')}${g.line ? ':' + g.line : ''} · ${esc([...g.pages].slice(0, 4).join(', '))}</div>
      ${g.stack ? `<details class="pr-error-stack"><summary>자세히</summary><pre>${esc(g.stack)}</pre><div class="pr-report-ctx">${esc(g.ua)}</div></details>` : ''}
      <div class="pr-report-actions"><button type="button" data-err-group="${i}">해결됨(삭제)</button></div>
    </div>`
    )
    .join('');
  listEl.querySelectorAll('[data-err-group]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const g = groups[Number(btn.dataset.errGroup)];
      btn.disabled = true;
      await Promise.all(g.ids.map((id) => firebase.database().ref('clientErrors/' + id).remove().catch(() => {})));
      bearipShowToast(`${g.count}건을 지웠어요`);
      prRenderErrors();
    });
  });
}

async function prClearAllErrors() {
  if (!confirm('기록된 오류를 전부 지울까요?')) return;
  try {
    await _bearipWhenFirebaseAuthed();
    await firebase.database().ref('clientErrors').remove();
    bearipShowToast('오류 기록을 모두 지웠어요');
  } catch (e) {
    bearipShowToast('지우지 못했어요. GM PIN으로 본인 확인이 필요해요');
  }
  prRenderErrors();
}

let prActiveFilter = 'all';

function prRenderList() {
  const list = document.getElementById('prList');
  const empty = document.getElementById('prEmpty');
  if (!list || !empty) return;

  const all = typeof bearipLoadProductionRequests === 'function' ? bearipLoadProductionRequests() : [];
  const filtered =
    prActiveFilter === 'trash'
      ? all.filter((r) => r.trashed)
      : prActiveFilter === 'all'
        ? all.filter((r) => !r.trashed)
        : all
            .filter((r) => !r.trashed && r.status === prActiveFilter)
            .sort((a, b) => (prActiveFilter === 'pending' ? new Date(a.requestedAt) - new Date(b.requestedAt) : 0));

  if (!filtered.length) {
    list.innerHTML = '';
    list.style.display = 'none';
    empty.style.display = 'flex';
    // Firebase's first sync can still be in flight — say so instead of
    // flatly claiming there's nothing, or a request that landed a moment
    // ago looks like it never arrived.
    const stillLoading = typeof bearipIsDataLoaded === 'function' && !bearipIsDataLoaded('productionRequests');
    const t = empty.querySelector('.t');
    const s = empty.querySelector('.s');
    if (t) t.textContent = stillLoading ? '불러오는 중이에요...' : '해당하는 제작요청이 없어요';
    if (s) s.textContent = stillLoading ? '' : 'MY DNA에서 누군가 제작을 요청하면 여기에 표시돼요.';
    return;
  }
  list.style.display = 'flex';
  empty.style.display = 'none';

  list.innerHTML = prPendingSummaryHtml(filtered) + filtered
    .map(
      (r) => `
    <div class="pr-card">
      <div class="pr-card-top">
        <div class="pr-card-ip">${bearipEscapeHtml(r.ipTitle || '제목 없는 IP')}${r.isFollowup ? ' · 추가문의' : ''}</div>
        <span class="pr-status ${r.status}">${PR_STATUS_LABEL[r.status] || r.status}</span>
      </div>
      <div class="pr-card-label">${bearipEscapeHtml(r.label)}</div>
      ${bearipTriageBadgeHtml(r)}
      <div class="pr-card-meta"><span>${r.isFollowup ? '추가문의' : r.price + 'C'}</span><span>${prFormatRelativeTime(r.requestedAt)}</span>${prAgeBadgeHtml(r)}</div>
      ${r.detail ? `<div class="pr-card-detail">"${bearipEscapeHtml(r.detail)}"</div>` : ''}
      ${r.resultNote ? `<div class="pr-card-result"><span>완료 메모</span>${bearipEscapeHtml(r.resultNote)}</div>` : ''}
      ${r.resultText ? `<div class="pr-card-result pr-card-result-text"><span>전달된 결과</span>${bearipEscapeHtml(r.resultText)}</div>` : ''}
      ${bearipRenderResultFileHtml(r, 'pr-result')}
      ${
        r.status === 'pending'
          ? `<div class="pr-card-actions">
               <button type="button" class="pr-complete-btn" data-id="${r.id}">업로드</button>
               <button type="button" class="pr-reject-btn" data-id="${r.id}">피드백</button>
             </div>
             ${r.triage ? '' : `<div class="pr-card-actions"><button type="button" class="pr-auto-btn" data-id="${r.id}">자동 처리 시도</button></div>`}`
          : r.trashed
            ? `<div class="pr-card-actions">
                 <button type="button" class="pr-restore-btn" data-id="${r.id}">복구</button>
                 <button type="button" class="pr-purge-btn" data-id="${r.id}">영구 삭제</button>
               </div>`
            : `<div class="pr-card-actions">
                 <button type="button" class="pr-trash-btn" data-id="${r.id}">휴지통으로</button>
               </div>`
      }
    </div>
  `
    )
    .join('');

  list.querySelectorAll('.pr-auto-btn').forEach((btn) => {
    btn.addEventListener('click', () => prTryAutoHandle(btn));
  });
  list.querySelectorAll('.pr-complete-btn').forEach((btn) => {
    btn.addEventListener('click', () => prOpenAction(btn.dataset.id, 'done'));
  });
  list.querySelectorAll('.pr-reject-btn').forEach((btn) => {
    btn.addEventListener('click', () => prOpenAction(btn.dataset.id, 'rejected'));
  });
  list.querySelectorAll('.pr-trash-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (typeof bearipUpdateProductionRequest === 'function') {
        bearipUpdateProductionRequest(btn.dataset.id, { trashed: true, trashedAt: new Date().toISOString() });
      }
      prRenderList();
    });
  });
  list.querySelectorAll('.pr-restore-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (typeof bearipUpdateProductionRequest === 'function') {
        bearipUpdateProductionRequest(btn.dataset.id, { trashed: false, trashedAt: null });
      }
      prRenderList();
    });
  });
  list.querySelectorAll('.pr-purge-btn').forEach((btn) => {
    btn.addEventListener('click', () => prConfirmPurge(btn.dataset.id));
  });
}

// A native confirm() can be blocked outright in some embedded/sandboxed
// contexts this prototype gets viewed in — same reasoning as my-dna-render.js
// avoiding prompt() for the asset-add tile — so this reuses the same
// pr-confirm-overlay pattern prOpenAction already uses on this page instead.
function prConfirmPurge(id) {
  const overlay = document.createElement('div');
  overlay.className = 'pr-confirm-overlay';
  overlay.innerHTML = `
    <div class="pr-confirm-box">
      <div class="pr-confirm-title">완전히 삭제할까요?</div>
      <div class="pr-confirm-desc">휴지통에서 영구 삭제돼요. 되돌릴 수 없어요.</div>
      <div class="pr-confirm-actions">
        <button type="button" class="pr-confirm-cancel">취소</button>
        <button type="button" class="pr-confirm-submit reject">영구 삭제</button>
      </div>
    </div>
  `;
  (document.querySelector('.dna-app') || document.body).appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('.pr-confirm-cancel').addEventListener('click', close);
  overlay.querySelector('.pr-confirm-submit').addEventListener('click', () => {
    close();
    if (typeof bearipDeleteProductionRequest === 'function') bearipDeleteProductionRequest(id);
    prRenderList();
  });
}

// The result file picked in prOpenAction's modal, staged here until 완료
//처리하기 actually submits — mirrors stepMaterialWorkingEntries' pattern in
// my-dna-render.js, just for a single file instead of a list.
let prResultPending = null;

// Built and appended fresh, removed on close — same as my-projects.js's
// delete-confirm modal, avoiding a persistent overlay's display/hidden footgun.
function prOpenAction(id, kind) {
  const req = (typeof bearipLoadProductionRequests === 'function' ? bearipLoadProductionRequests() : []).find(
    (r) => r.id === id
  );
  if (!req) return;

  const isDone = kind === 'done';
  prResultPending = null;
  const overlay = document.createElement('div');
  overlay.className = 'pr-confirm-overlay';
  overlay.innerHTML = `
    <div class="pr-confirm-box">
      <div class="pr-confirm-title">'${bearipEscapeHtml(req.ipTitle)}'의 '${bearipEscapeHtml(req.label)}'을(를) ${isDone ? '업로드' : '피드백'}할까요?</div>
      <div class="pr-confirm-desc">${
        isDone
          ? '요청자에게 완료 알림이 전달돼요.'
          : `요청자에게 거절 알림이 전달되고, 결제했던 ${req.price}C가 환불돼요.`
      }</div>
      ${
        isDone
          ? `<label class="pr-confirm-label" for="prResultFileInput">결과물 파일 (선택)</label>
             <div class="pr-result-upload" id="prResultUpload">
               <input type="file" id="prResultFileInput" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.mp3,.wav,.mp4,.mov,.webm" style="display:none">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 15l5-5 4 4 4-4 5 5"/><circle cx="8" cy="9" r="1.4"/></svg>
               <div class="t">클릭해서 결과물 파일 업로드</div>
               <div class="d">이미지, 영상, PDF, 워드, 텍스트, 음향 — 최대 5MB</div>
             </div>
             <label class="pr-confirm-label" for="prResultLink">결과물 링크 (선택 — 영상처럼 5MB 넘는 파일은 구글드라이브 등에 올린 뒤 링크로 전달해주세요)</label>
             <input type="text" id="prResultLink" class="pr-confirm-input" placeholder="https://...">`
          : ''
      }
      <label class="pr-confirm-label" for="prActionNote">${isDone ? '완료 메모 (선택)' : '거절 사유 (선택)'}</label>
      <textarea id="prActionNote" class="pr-confirm-textarea" placeholder="${
        isDone ? '전달할 결과물에 대한 설명을 적어주세요.' : '거절 사유를 적어주세요.'
      }"></textarea>
      <div class="pr-confirm-actions">
        <button type="button" class="pr-confirm-cancel">취소</button>
        <button type="button" class="pr-confirm-submit ${isDone ? 'done' : 'reject'}">${isDone ? '업로드하기' : '피드백 보내기'}</button>
      </div>
    </div>
  `;
  (document.querySelector('.dna-app') || document.body).appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('.pr-confirm-cancel').addEventListener('click', close);

  if (isDone) {
    const uploadEl = overlay.querySelector('#prResultUpload');
    const fileInput = overlay.querySelector('#prResultFileInput');
    uploadEl.addEventListener('click', () => fileInput.click());
    if (typeof bearipEnableFileDrop === 'function') bearipEnableFileDrop(uploadEl, fileInput);
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      uploadEl.classList.remove('error');
      const setError = (msg) => {
        uploadEl.classList.add('error');
        uploadEl.querySelector('.d').textContent = msg;
      };
      if (file.type.startsWith('image/')) {
        try {
          const imageData = await bearipResizeImageToDataUrl(file, 720, 0.85);
          prResultPending = { imageData, fileData: null, fileName: file.name, fileSize: file.size, mime: file.type };
          uploadEl.classList.add('has-file');
          uploadEl.style.backgroundImage = `url('${imageData}')`;
          uploadEl.querySelector('.t').textContent = file.name;
        } catch (e) {
          setError(e.message || '이미지를 불러오지 못했어요');
        }
      } else if (typeof bearipIsInlineAttachmentFile === 'function' && bearipIsInlineAttachmentFile(file)) {
        if (file.size > BEARIP_MAX_INLINE_FILE_BYTES) {
          setError('파일은 최대 5MB까지 첨부할 수 있어요');
          return;
        }
        try {
          const fileData = await bearipReadFileAsDataUrl(file);
          prResultPending = { imageData: null, fileData, fileName: file.name, fileSize: file.size, mime: file.type };
          uploadEl.classList.add('has-file');
          uploadEl.querySelector('.t').textContent = file.name;
        } catch (e) {
          setError(e.message || '파일을 불러오지 못했어요');
        }
      } else {
        setError('지원하지 않는 파일 형식이에요');
      }
    });
  }

  overlay.querySelector('.pr-confirm-submit').addEventListener('click', () => {
    const note = document.getElementById('prActionNote').value.trim();
    const linkInput = document.getElementById('prResultLink');
    const link = linkInput ? linkInput.value.trim() : '';
    prApplyAction(req, kind, note, prResultPending, link);
    close();
  });
}

function prApplyAction(req, kind, note, resultFile, resultLink) {
  const patch = { status: kind };
  if (kind === 'done') {
    patch.resultNote = note;
    if (resultFile) {
      patch.resultImageData = resultFile.imageData || null;
      patch.resultFileData = resultFile.fileData || null;
      patch.resultFileName = resultFile.fileName || null;
      patch.resultFileSize = resultFile.fileSize || null;
      patch.resultMime = resultFile.mime || null;
    }
    if (resultLink) patch.resultLink = resultLink;
  }
  bearipUpdateProductionRequest(req.id, patch);
  // GM is on its own device/account now, with no access to the requester's
  // local IP data — the requester's own MY DNA pulls this result (and, on a
  // rejection, refunds the credit) in itself once the update above lands,
  // via mdReconcileRemoteStatus in my-dna-render.js.

  bearipAddNotification(
    {
      type: 'production',
      title: kind === 'done' ? '제작이 완료됐어요' : '제작요청이 거절됐어요',
      message:
        kind === 'done'
          ? `'${req.ipTitle}'의 '${req.label}' 제작이 완료됐어요.${resultFile || resultLink ? ' 결과물을 확인해보세요.' : ''}${note ? ` ${note}` : ''}`
          : `'${req.ipTitle}'의 '${req.label}' 제작요청이 거절됐어요. ${req.price}C를 환불했어요.${note ? ` 사유: ${note}` : ''}`,
      link: 'my-dna.html',
    },
    req.requesterNickname
  );

  prRenderList();
  bearipShowToast(kind === 'done' ? '완료 처리했어요' : '요청을 거절했어요');
}

document.getElementById('prFilterRow').addEventListener('click', (e) => {
  const btn = e.target.closest('.pr-filter-btn');
  if (!btn) return;
  document.querySelectorAll('.pr-filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  prActiveFilter = btn.dataset.filter;
  prRenderList();
});

document.addEventListener('DOMContentLoaded', () => {
  if (!prIsGm()) {
    prShowGmLocked();
    return;
  }
  prRenderList();
  prRenderReports();
  if (typeof bearipOnDataChange === 'function') {
    bearipOnDataChange('productionRequests', prRenderList);
    bearipOnDataChange('reports', prRenderReports);
  }

  prRenderErrors();
  document.getElementById('prErrorReload').addEventListener('click', prRenderErrors);
  document.getElementById('prErrorClearAll').addEventListener('click', prClearAllErrors);
  prWireInvite();
  document.getElementById('prAcctLoad').addEventListener('click', prAcctLoad);
  document.getElementById('prAcctNudgeAll').addEventListener('click', () => {
    if (!prAcctState) return;
    prAcctNudge(prAcctState.people.filter((p) => !p.hasPin).map((p) => p.nickname));
  });
  document.getElementById('prAcctList').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-nudge]');
    if (btn) prAcctNudge([btn.dataset.nudge]);
  });
  document.getElementById('prAcctOwnerless').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-assign]');
    if (!btn) return;
    const select = document.querySelector(`[data-owner-select="${CSS.escape(btn.dataset.assign)}"]`);
    if (select) prAcctAssign(btn.dataset.assign, select.value);
  });
  document.getElementById('prAiLoad').addEventListener('click', () => prAiRequest('get'));
  document.getElementById('prAiSave').addEventListener('click', () => prAiRequest('set'));

  const scanBtn = document.getElementById('prCleanupScanBtn');
  if (scanBtn) scanBtn.addEventListener('click', () => prRenderCleanupResult(bearipScanOrphans()));
});
