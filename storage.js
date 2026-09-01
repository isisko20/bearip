// Shared localStorage-backed store for BEARIP IPs (prototype only, no backend).
const BEARIP_IPS_KEY = 'bearip_ips';
const BEARIP_CURRENT_KEY = 'bearip_current_ip';

// Each goal (목표 포맷) has a genuinely different production pipeline, so the
// roadmap's steps depend on which one is selected — not just its title.
// Shared between new-ip.js (initial creation) and my-dna-render.js
// (switching goals later) so both produce the same step set for a goal.
const BEARIP_ROADMAP_TEMPLATES = {
  webnovel: [
    { key: 'story', label: '스토리<br>기획' },
    { key: 'character', label: '캐릭터<br>설정' },
    { key: 'visual', label: '세계관<br>구축' },
    { key: 'storyboard', label: '초고<br>집필' },
    { key: 'lettering', label: '퇴고/<br>교정' },
    { key: 'art', label: '표지<br>디자인' },
    { key: 'upload', label: '업로드/<br>연재' },
  ],
  webtoon: [
    { key: 'story', label: '스토리' },
    { key: 'character', label: '캐릭터<br>디자인' },
    { key: 'visual', label: '비주얼<br>가이드' },
    { key: 'background', label: '배경/장소' },
    { key: 'storyboard', label: '콘티' },
    { key: 'art', label: '작화' },
    { key: 'lettering', label: '레터링/<br>검수' },
    { key: 'upload', label: '업로드/<br>연재' },
  ],
  video: [
    { key: 'story', label: '시나리오' },
    { key: 'character', label: '캐릭터/<br>컨셉 디자인' },
    { key: 'storyboard', label: '스토리보드' },
    { key: 'art', label: '촬영/제작' },
    { key: 'lettering', label: '편집/<br>사운드' },
    { key: 'upload', label: '업로드/<br>공개' },
  ],
  multi: [
    { key: 'story', label: '스토리' },
    { key: 'character', label: '캐릭터<br>디자인' },
    { key: 'visual', label: '비주얼<br>가이드' },
    { key: 'background', label: '세계관/<br>설정' },
    { key: 'storyboard', label: '포맷별<br>기획' },
    { key: 'art', label: '웹툰/영상<br>제작' },
    { key: 'lettering', label: '현지화/<br>검수' },
    { key: 'upload', label: '멀티<br>배포' },
  ],
};

// Builds the roadmap for a goal, preserving status/progress for any step
// that also exists in the previous roadmap (matched by key) — switching
// goals shouldn't silently discard progress on shared steps like 스토리.
function bearipBuildRoadmap(goal, previousRoadmap) {
  const template = BEARIP_ROADMAP_TEMPLATES[goal] || BEARIP_ROADMAP_TEMPLATES.webtoon;
  const prevByKey = {};
  (previousRoadmap || []).forEach((s) => {
    prevByKey[s.key] = s;
  });
  return template.map((step) => {
    const prev = prevByKey[step.key];
    return {
      key: step.key,
      label: step.label,
      status: prev ? prev.status : 'todo',
      progress: prev ? prev.progress : 0,
    };
  });
}

function bearipLoadIPs() {
  try {
    const raw = localStorage.getItem(BEARIP_IPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function bearipSaveIPs(ips) {
  localStorage.setItem(BEARIP_IPS_KEY, JSON.stringify(ips));
}

function bearipAddIP(ip) {
  const ips = bearipLoadIPs();
  ips.unshift(ip);
  bearipSaveIPs(ips);
  localStorage.setItem(BEARIP_CURRENT_KEY, ip.id);
  return ip;
}

function bearipUpdateIP(id, patch) {
  const ips = bearipLoadIPs();
  const idx = ips.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  ips[idx] = Object.assign({}, ips[idx], patch);
  bearipSaveIPs(ips);
  return ips[idx];
}

function bearipGetCurrentIP() {
  const id = localStorage.getItem(BEARIP_CURRENT_KEY);
  if (!id) return null;
  return bearipLoadIPs().find((i) => i.id === id) || null;
}

function bearipSetCurrentId(id) {
  localStorage.setItem(BEARIP_CURRENT_KEY, id);
}

// ---- CREW MATCH recruiting posts ----
const BEARIP_POSITIONS_KEY = 'bearip_positions';

function bearipLoadPositions() {
  try {
    const raw = localStorage.getItem(BEARIP_POSITIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function bearipSavePositions(list) {
  localStorage.setItem(BEARIP_POSITIONS_KEY, JSON.stringify(list));
}

function bearipAddPosition(position) {
  const list = bearipLoadPositions();
  list.unshift(position);
  bearipSavePositions(list);
  return position;
}

function bearipUpdatePosition(id, patch) {
  const list = bearipLoadPositions();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  list[idx] = Object.assign({}, list[idx], patch);
  bearipSavePositions(list);
  return list[idx];
}

// ---- Applicants for postings the current user owns (CREW MATCH 모집글) ----
const BEARIP_APPLICANTS_KEY = 'bearip_position_applicants';

function bearipLoadApplicantsMap() {
  try {
    const raw = localStorage.getItem(BEARIP_APPLICANTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function bearipSaveApplicantsMap(map) {
  localStorage.setItem(BEARIP_APPLICANTS_KEY, JSON.stringify(map));
}

function bearipGetApplicants(positionId) {
  return bearipLoadApplicantsMap()[positionId] || [];
}

// Seeds two example applicants the first time a posting's list is read, so
// "지원자 확인" has something to demonstrate immediately — same pattern as
// MY DNA's seeded discussion comments and the seeded notifications.
function bearipSeedApplicantsIfEmpty(positionId) {
  const map = bearipLoadApplicantsMap();
  if (map[positionId]) return map[positionId];
  const now = Date.now();
  const seed = [
    {
      id: 'app_seed_1_' + positionId,
      name: '몽몽',
      role: '비주얼 가이드',
      bio: '분위기와 색감 위주로 작업해요. 최근엔 배경 컨셉 위주로 작업하고 있어요.',
      portfolioCount: 4,
      appliedAt: new Date(now - 60 * 24 * 2 * 60000).toISOString(),
      status: 'pending',
    },
    {
      id: 'app_seed_2_' + positionId,
      name: '라라',
      role: '스토리보드',
      bio: '장면 연출과 흐름 짜는 걸 좋아합니다. 웹툰 콘티 작업 경험이 있어요.',
      portfolioCount: 2,
      appliedAt: new Date(now - 60 * 24 * 60000).toISOString(),
      status: 'pending',
    },
  ];
  map[positionId] = seed;
  bearipSaveApplicantsMap(map);
  return seed;
}

function bearipAddApplicant(positionId, applicant) {
  const map = bearipLoadApplicantsMap();
  const list = map[positionId] || [];
  const existingIdx = list.findIndex((a) => a.name === applicant.name);
  if (existingIdx !== -1) list[existingIdx] = applicant;
  else list.push(applicant);
  map[positionId] = list;
  bearipSaveApplicantsMap(map);
  return applicant;
}

function bearipRemoveApplicantByName(positionId, name) {
  const map = bearipLoadApplicantsMap();
  map[positionId] = (map[positionId] || []).filter((a) => a.name !== name);
  bearipSaveApplicantsMap(map);
}

function bearipUpdateApplicantStatus(positionId, applicantId, status) {
  const map = bearipLoadApplicantsMap();
  const list = map[positionId] || [];
  const idx = list.findIndex((a) => a.id === applicantId);
  if (idx === -1) return null;
  list[idx] = Object.assign({}, list[idx], { status });
  map[positionId] = list;
  bearipSaveApplicantsMap(map);
  return list[idx];
}

// ---- Mock login / current user (no backend — nickname-only) ----
const BEARIP_USER_KEY = 'bearip_user';

function bearipGetUser() {
  try {
    const raw = localStorage.getItem(BEARIP_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function bearipSetUser(user) {
  localStorage.setItem(BEARIP_USER_KEY, JSON.stringify(user));
  return user;
}

function bearipLogout() {
  localStorage.removeItem(BEARIP_USER_KEY);
}

// Sends the user to the login page, remembering where to bring them back to.
// The return target is kept in sessionStorage rather than a ?next= query
// param, since some static hosts/dev servers rewrite URLs and drop query
// strings on redirect.
const BEARIP_LOGIN_NEXT_KEY = 'bearip_login_next';

function bearipGoToLogin(nextUrl) {
  let target = nextUrl || location.pathname.split('/').pop() || 'index.html';
  // Some dev servers (clean-URL redirects) strip the .html extension from
  // location.pathname — restore it so the stored target still resolves on
  // hosts (like GitHub Pages) that require the real filename.
  if (target && !target.includes('.')) target += '.html';
  sessionStorage.setItem(BEARIP_LOGIN_NEXT_KEY, target);
  location.href = 'login.html';
}

// Returns true if already logged in, false if it redirected to login.
function bearipRequireLogin(nextUrl) {
  if (bearipGetUser()) return true;
  bearipGoToLogin(nextUrl);
  return false;
}

// ---- Profile: positions I can fill, and portfolio ----
const BEARIP_MY_POSITIONS_KEY = 'bearip_my_positions';
const BEARIP_PORTFOLIO_KEY = 'bearip_portfolio';

function bearipGetMyPositions() {
  try {
    const raw = localStorage.getItem(BEARIP_MY_POSITIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function bearipSetMyPositions(list) {
  localStorage.setItem(BEARIP_MY_POSITIONS_KEY, JSON.stringify(list));
}

function bearipLoadPortfolio() {
  try {
    const raw = localStorage.getItem(BEARIP_PORTFOLIO_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function bearipSavePortfolio(list) {
  localStorage.setItem(BEARIP_PORTFOLIO_KEY, JSON.stringify(list));
}

function bearipAddPortfolioItem(item) {
  const list = bearipLoadPortfolio();
  list.unshift(item);
  bearipSavePortfolio(list);
  return item;
}

function bearipDeletePortfolioItem(id) {
  const list = bearipLoadPortfolio().filter((p) => p.id !== id);
  bearipSavePortfolio(list);
}

// ---- Generic per-browser "membership" sets, e.g. followed IPs, joined IPs,
// applied-to positions — anywhere a button just needs an on/off toggle that
// survives reload, keyed by a namespaced localStorage key. ----
function bearipSetList(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (e) {
    return [];
  }
}

function bearipSetHas(key, id) {
  try {
    const arr = JSON.parse(localStorage.getItem(key)) || [];
    return arr.includes(id);
  } catch (e) {
    return false;
  }
}

// Toggles membership and returns the new state (true = now in the set).
function bearipSetToggle(key, id) {
  let arr;
  try {
    arr = JSON.parse(localStorage.getItem(key)) || [];
  } catch (e) {
    arr = [];
  }
  const has = arr.includes(id);
  arr = has ? arr.filter((x) => x !== id) : arr.concat([id]);
  localStorage.setItem(key, JSON.stringify(arr));
  return !has;
}

// ---- Content comments, keyed per content id (e.g. an episode) ----
function bearipLoadComments(contentId) {
  try {
    const raw = localStorage.getItem('bearip_comments_' + contentId);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function bearipAddComment(contentId, comment) {
  const list = bearipLoadComments(contentId);
  list.unshift(comment);
  localStorage.setItem('bearip_comments_' + contentId, JSON.stringify(list));
  return comment;
}

// ---- Notifications ----
const BEARIP_NOTIFICATIONS_KEY = 'bearip_notifications';

function bearipLoadNotifications() {
  try {
    const raw = localStorage.getItem(BEARIP_NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function bearipSaveNotifications(list) {
  localStorage.setItem(BEARIP_NOTIFICATIONS_KEY, JSON.stringify(list));
}

function bearipAddNotification(notif) {
  const list = bearipLoadNotifications();
  list.unshift(Object.assign({
    id: 'ntf_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    read: false,
    createdAt: new Date().toISOString(),
  }, notif));
  bearipSaveNotifications(list);
}

function bearipGetUnreadCount() {
  return bearipLoadNotifications().filter((n) => !n.read).length;
}

function bearipMarkAllNotificationsRead() {
  const list = bearipLoadNotifications().map((n) => Object.assign({}, n, { read: true }));
  bearipSaveNotifications(list);
}

function bearipMarkNotificationRead(id) {
  const list = bearipLoadNotifications().map((n) => (n.id === id ? Object.assign({}, n, { read: true }) : n));
  bearipSaveNotifications(list);
}

// Seeds a handful of demo notifications the very first time this browser
// visits (i.e. the notifications key has never been set) so the inbox and
// unread dot aren't empty on a fresh session. Real actions (creating an IP,
// posting/applying to a position, ...) add their own notifications on top.
function bearipSeedNotificationsIfEmpty() {
  if (localStorage.getItem(BEARIP_NOTIFICATIONS_KEY) !== null) return;
  const now = Date.now();
  const seed = [
    {
      type: 'system',
      title: 'Thinkit에 오신 걸 환영해요',
      message: '프로필을 채우고 CREW MATCH에서 함께할 크루를 찾아보세요.',
      link: 'profile.html',
      minutesAgo: 60 * 24 * 3,
    },
    {
      type: 'ip',
      title: '챌린지로 승급했어요',
      message: '서울 야행수선단이 DNA SCORE 78%를 달성해 챌린지 단계로 승급했어요.',
      link: 'open-dna.html',
      minutesAgo: 60 * 20,
    },
    {
      type: 'crew',
      title: '매치 제안이 수락됐어요',
      message: 'OCEAN PLANET · 레터링 스페셜리스트 포지션에 합류하게 됐어요.',
      link: 'crew-match.html',
      minutesAgo: 60 * 5,
    },
    {
      type: 'discussion',
      title: '라라님이 댓글을 남겼어요',
      message: 'EP03 콘티 초안 올렸어요! 배경 톤 관련해서 의견 부탁드려요 🙏',
      link: 'my-dna.html',
      minutesAgo: 40,
    },
  ];
  const list = seed.map((n, i) => ({
    id: 'ntf_seed_' + i,
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link,
    read: false,
    createdAt: new Date(now - n.minutesAgo * 60000).toISOString(),
  }));
  bearipSaveNotifications(list);
}

// ---- Uploaded asset files (IndexedDB — localStorage's ~5-10MB origin quota
// can't hold real files, IndexedDB gives us realistic headroom for documents
// and short video clips). Only non-image files go through here; images are
// downscaled to a small inline thumbnail and kept in the IP's own JSON. ----
const BEARIP_FILES_DB = 'bearip-files';
const BEARIP_FILES_STORE = 'assetFiles';
const BEARIP_MAX_ASSET_FILE_BYTES = 50 * 1024 * 1024; // 50MB

function bearipOpenFilesDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('이 브라우저는 파일 저장을 지원하지 않아요'));
      return;
    }
    const req = indexedDB.open(BEARIP_FILES_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(BEARIP_FILES_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('저장소를 열지 못했어요'));
  });
}

// Best-effort pre-flight check using the Storage API; returns true when the
// browser doesn't support estimate() so we fall through to the real write
// (which still fails safely via try/catch if space actually runs out).
async function bearipCheckStorageRoom(fileSize) {
  if (!navigator.storage || !navigator.storage.estimate) return true;
  try {
    const { quota, usage } = await navigator.storage.estimate();
    if (typeof quota !== 'number' || typeof usage !== 'number') return true;
    return quota - usage > fileSize * 1.1;
  } catch (e) {
    return true;
  }
}

function bearipSaveAssetFile(id, file) {
  return bearipOpenFilesDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(BEARIP_FILES_STORE, 'readwrite');
        tx.objectStore(BEARIP_FILES_STORE).put({ blob: file, name: file.name, type: file.type, size: file.size }, id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('파일 저장에 실패했어요'));
        tx.onabort = () => reject(tx.error || new Error('파일 저장에 실패했어요'));
      })
  );
}

function bearipGetAssetFile(id) {
  return bearipOpenFilesDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(BEARIP_FILES_STORE, 'readonly');
        const req = tx.objectStore(BEARIP_FILES_STORE).get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error || new Error('파일을 불러오지 못했어요'));
      })
  );
}

function bearipDeleteAssetFile(id) {
  return bearipOpenFilesDb()
    .then(
      (db) =>
        new Promise((resolve) => {
          const tx = db.transaction(BEARIP_FILES_STORE, 'readwrite');
          tx.objectStore(BEARIP_FILES_STORE).delete(id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        })
    )
    .catch(() => {});
}
