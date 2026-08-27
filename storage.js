// Shared localStorage-backed store for BEARIP IPs (prototype only, no backend).
const BEARIP_IPS_KEY = 'bearip_ips';
const BEARIP_CURRENT_KEY = 'bearip_current_ip';

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

// Redirects to the login page (preserving where to return to) when no user
// is signed in. Returns true if already logged in, false if it redirected.
// The return target is kept in sessionStorage rather than a ?next= query
// param, since some static hosts/dev servers rewrite URLs and drop query
// strings on redirect.
const BEARIP_LOGIN_NEXT_KEY = 'bearip_login_next';

function bearipRequireLogin(nextUrl) {
  if (bearipGetUser()) return true;
  const target = nextUrl || location.pathname.split('/').pop() || 'index.html';
  sessionStorage.setItem(BEARIP_LOGIN_NEXT_KEY, target);
  location.href = 'login.html';
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
      title: 'BEARIP에 오신 걸 환영해요',
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
