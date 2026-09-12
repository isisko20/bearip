// Shared localStorage-backed store for BEARIP IPs (prototype only, no backend).
const BEARIP_IPS_KEY = 'bearip_ips';
const BEARIP_CURRENT_KEY = 'bearip_current_ip';

// ---- Site-wide light/dark preference. Every dr-*/od-* page shares it; only
// the landing page and CONTENT ROOM are excluded (CONTENT ROOM's CSS isn't
// variable-driven the same way yet).
const BEARIP_THEME_KEY = 'bearip_theme';

function bearipGetTheme() {
  try {
    return localStorage.getItem(BEARIP_THEME_KEY) || 'light';
  } catch (e) {
    return 'light';
  }
}

function bearipSetTheme(theme) {
  try {
    localStorage.setItem(BEARIP_THEME_KEY, theme);
  } catch (e) {
    /* ignore */
  }
}

// ---- Credits — pays for "제작요청" (asking a real person/AI to make a MY
// DNA part instead of self-producing it). No payment gateway exists in this
// prototype, so 충전 (top-up) just adds the number straight to the balance;
// the balance itself, and every request/refund that spends or returns it,
// is real and persisted.
const BEARIP_CREDITS_KEY = 'bearip_credits';

function bearipGetCredits() {
  const n = parseInt(localStorage.getItem(BEARIP_CREDITS_KEY), 10);
  return Number.isFinite(n) ? n : 0;
}

function bearipSetCredits(amount) {
  localStorage.setItem(BEARIP_CREDITS_KEY, String(Math.max(0, amount)));
}

function bearipAddCredits(amount) {
  const next = bearipGetCredits() + amount;
  bearipSetCredits(next);
  return next;
}

// Returns false (no mutation) if the balance can't cover it.
function bearipSpendCredits(amount) {
  const current = bearipGetCredits();
  if (current < amount) return false;
  bearipSetCredits(current - amount);
  return true;
}

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

// Credit cost to have each roadmap step made by 제작요청 instead of
// self-producing it — one price per step key, shared across every goal's
// template since the same key means the same kind of work either way.
const BEARIP_ROADMAP_STEP_PRICE = {
  story: 40,
  character: 60,
  visual: 70,
  background: 50,
  storyboard: 55,
  lettering: 35,
  art: 90,
  upload: 20,
};

// Builds the roadmap for a goal, preserving status/progress/mode for any
// step that also exists in the previous roadmap (matched by key) —
// switching goals shouldn't silently discard progress on shared steps like
// 스토리, or quietly cancel a 제작요청 already in flight for one.
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
      mode: prev && prev.mode ? prev.mode : 'self',
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

function bearipDeleteIP(id) {
  const ip = bearipLoadIPs().find((i) => i.id === id);
  bearipSaveIPs(bearipLoadIPs().filter((i) => i.id !== id));
  // Falls back to the demo project the next time anything reads the current
  // IP (bearipGetCurrentIP already treats an id with no matching IP as "none").
  if (localStorage.getItem(BEARIP_CURRENT_KEY) === id) {
    localStorage.removeItem(BEARIP_CURRENT_KEY);
  }
  if (!ip) return;

  // A CREW MATCH posting only exists to recruit for this IP, and an
  // applicant record only exists to apply to one of those postings — both
  // are meaningless (and confusing to see) once the IP itself is gone.
  // Positions link back by title, not id (same convention used everywhere
  // else — cmResolveIpByTitle, my-dna-applicants.js, ip-detail.js), so this
  // assumes IP titles are unique, same as those do.
  const positions = bearipLoadPositions();
  const orphaned = positions.filter((p) => p.ipTitle === ip.title);
  if (orphaned.length === 0) return;

  bearipSavePositions(positions.filter((p) => p.ipTitle !== ip.title));
  const applicantsMap = bearipLoadApplicantsMap();
  const orphanedIds = orphaned.map((p) => p.id);
  orphanedIds.forEach((posId) => delete applicantsMap[posId]);
  bearipSaveApplicantsMap(applicantsMap);
  // Also drop the deleted postings out of the current user's own "지원한
  // 포지션" set, so 나의 매치 현황 doesn't show a dangling, unresolvable id.
  const APPLIED_KEY = 'bearip_applied_positions';
  const stillApplied = bearipSetList(APPLIED_KEY).filter((posId) => !orphanedIds.includes(posId));
  localStorage.setItem(APPLIED_KEY, JSON.stringify(stillApplied));
}

// ---- Shared "IP DNA 현황" breakdown metadata ----
// Used by MY DNA (my-dna-render.js), OPEN DNA's DNA report popup, and the
// DNA ROOM home summary, so all three stay in sync with one definition.
const BEARIP_DNA_CATEGORIES = [
  { key: 'concept', label: 'CONCEPT', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z"/></svg>' },
  { key: 'world', label: 'WORLD', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 010 18 15 15 0 010-18z"/></svg>' },
  { key: 'character', label: 'CHARACTER', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M2.5 20c0-3.4 2.8-5.6 6.5-5.6s6.5 2.2 6.5 5.6"/><path d="M15.5 14.6c2 .2 3.6 1.7 4 3.6"/></svg>' },
  { key: 'story', label: 'STORY / CANON', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4.5C4 3.7 4.7 3 5.5 3H18a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2z"/><path d="M6 3v18M9 8h7M9 12h7"/></svg>' },
  { key: 'visual', label: 'VISUAL', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 100 18c1.1 0 2-.9 2-2 0-.6-.2-1-.5-1.4-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 004-4c0-4.4-4-7.5-9-7.5z"/><circle cx="7.5" cy="10.5" r="1.1" fill="currentColor"/><circle cx="11" cy="7.5" r="1.1" fill="currentColor"/><circle cx="15" cy="8.5" r="1.1" fill="currentColor"/></svg>' },
  { key: 'assets', label: 'WORLD ASSETS', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>' },
];

// Credit cost to have each DNA category made via 제작요청 instead of
// self-producing it (my-dna-render.js's IP DNA 현황 popup).
const BEARIP_DNA_PRODUCTION_PRICE = {
  concept: 30,
  world: 50,
  character: 60,
  story: 70,
  visual: 80,
  assets: 50,
};

const BEARIP_DNA_TIPS = {
  concept: { high: '세계관의 핵심 컨셉이 잘 정리되어 있어요!', mid: '핵심 컨셉을 조금 더 다듬어보세요.', low: '핵심 컨셉 정리가 필요해요.' },
  world: { high: '세계의 규칙과 배경이 탄탄해요!', mid: '세계의 규칙과 배경을 더 구체화해보세요.', low: '세계관 설정이 필요해요.' },
  character: { high: '캐릭터 설정이 탄탄해요! 관계도를 확장해보세요.', mid: '캐릭터 관계도를 확장해보세요.', low: '캐릭터 설정이 필요해요.' },
  story: { high: '메인 플롯과 에피소드 구성이 탄탄해요!', mid: '메인 플롯과 에피소드 구상이 필요해요.', low: '스토리 라인 정리가 필요해요.' },
  visual: { high: '비주얼 스타일이 잘 정립되어 있어요!', mid: '비주얼 스타일을 더 다듬어보세요.', low: '비주얼 스타일 정립이 필요해요.' },
  assets: { high: '장소, 소품, 상징이 잘 채워져 있어요!', mid: '장소, 소품, 상징을 더 채워보세요.', low: '월드 자산 정리가 필요해요.' },
};

function bearipDnaTip(key, value) {
  const tier = value >= 70 ? 'high' : value >= 40 ? 'mid' : 'low';
  return (BEARIP_DNA_TIPS[key] && BEARIP_DNA_TIPS[key][tier]) || '';
}

function bearipDnaScoreTier(score) {
  if (score >= 80) return 'Great!';
  if (score >= 60) return 'Good!';
  if (score >= 40) return 'Fair';
  return 'Just Started';
}

function bearipRecomputeDnaScore(breakdown) {
  if (!breakdown) return 0;
  const keys = BEARIP_DNA_CATEGORIES.map((c) => c.key);
  return Math.round(keys.reduce((sum, k) => sum + (breakdown[k] || 0), 0) / keys.length);
}

// Older/incomplete IPs may only have a single dnaScore number. Seeds all 6
// categories from it (so nothing looks broken) and persists the migration,
// idempotently — safe to call on every read.
function bearipEnsureDnaBreakdown(ip) {
  if (ip.dnaBreakdown) return ip.dnaBreakdown;
  const seed = ip.dnaScore || 0;
  const breakdown = {};
  BEARIP_DNA_CATEGORIES.forEach((c) => { breakdown[c.key] = seed; });
  ip.dnaBreakdown = breakdown;
  ip.dnaScore = bearipRecomputeDnaScore(breakdown);
  if (ip.id && ip.id !== 'demo') bearipUpdateIP(ip.id, { dnaBreakdown: breakdown, dnaScore: ip.dnaScore });
  return breakdown;
}

// A roadmap step used to hold at most one registered item (`step.submission`,
// a single object). Steps can now hold several (`step.submissions`, an
// array — e.g. 시나리오의 1화/2화를 따로 등록), so any step still in the old
// shape gets migrated in place the first time it's read, idempotently, same
// pattern as bearipEnsureDnaBreakdown above.
function bearipEnsureRoadmapSubmissions(ip) {
  if (!ip || !Array.isArray(ip.roadmap)) return;
  let migrated = false;
  ip.roadmap.forEach((step) => {
    if (Array.isArray(step.submissions)) return;
    if (step.submission) {
      step.submissions = [Object.assign({ id: 'legacy' }, step.submission)];
    } else {
      step.submissions = [];
    }
    delete step.submission;
    migrated = true;
  });
  if (migrated && ip.id && ip.id !== 'demo') bearipUpdateIP(ip.id, { roadmap: ip.roadmap });
}

// ---- Unified growth stage (OPEN DNA badges + CONTENT ROOM rows) ----
// Both pages used to show a stage word with nothing real behind it (OPEN
// DNA's real published cards were hardcoded "MY IP", CONTENT ROOM's rows
// were almost entirely mock cards). This derives one real stage straight
// from dnaScore, so "how developed is this IP" means the same thing
// everywhere instead of two separate, disconnected labels.
const BEARIP_STAGE_LABELS = { seed: 'SEED', rising: 'RISING', challenge: 'CHALLENGE', official: 'OFFICIAL' };

function bearipGrowthStage(dnaScore) {
  const score = dnaScore || 0;
  if (score >= 90) return 'official';
  if (score >= 70) return 'challenge';
  if (score >= 25) return 'rising';
  return 'seed';
}

function bearipFormatCount(n) {
  return (n || 0).toLocaleString('ko-KR');
}

function bearipParseCount(text) {
  return parseInt(String(text).replace(/,/g, ''), 10) || 0;
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

// ---- 제작요청 history — every production request a user has submitted
// from MY DNA, kept separately from the IP's own self/requested mode flag
// so the user can see a full list (including cancelled ones) later, and so
// a future 관리자 승인/AI evaluation flow has somewhere to write a 'done'
// status without changing this shape.
const BEARIP_PRODUCTION_REQUESTS_KEY = 'bearip_production_requests';

function bearipLoadProductionRequests() {
  try {
    const raw = localStorage.getItem(BEARIP_PRODUCTION_REQUESTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function bearipSaveProductionRequests(list) {
  localStorage.setItem(BEARIP_PRODUCTION_REQUESTS_KEY, JSON.stringify(list));
}

function bearipAddProductionRequest(req) {
  const list = bearipLoadProductionRequests();
  list.unshift(req);
  bearipSaveProductionRequests(list);
  return req;
}

function bearipUpdateProductionRequest(id, patch) {
  const list = bearipLoadProductionRequests();
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  list[idx] = Object.assign({}, list[idx], patch);
  bearipSaveProductionRequests(list);
  return list[idx];
}

// ---- IP 심사 요청 — one entry per roadmap step the creator submitted
// material for at IP-creation time. Separate from 제작요청 (which is about
// outsourcing a step to a Creator); this is the page-admin scoring how
// complete/real a step's submitted material actually is, per step, with a
// one-line comment — mirrored back onto the IP's own roadmap step (see
// ip-reviews.js) so MY DNA can show it without re-reading this list.
const BEARIP_IP_REVIEWS_KEY = 'bearip_ip_reviews';

function bearipLoadIpReviews() {
  try {
    const raw = localStorage.getItem(BEARIP_IP_REVIEWS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function bearipSaveIpReviews(list) {
  localStorage.setItem(BEARIP_IP_REVIEWS_KEY, JSON.stringify(list));
}

function bearipAddIpReview(review) {
  const list = bearipLoadIpReviews();
  list.unshift(review);
  bearipSaveIpReviews(list);
  return review;
}

function bearipUpdateIpReview(id, patch) {
  const list = bearipLoadIpReviews();
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  list[idx] = Object.assign({}, list[idx], patch);
  bearipSaveIpReviews(list);
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

// Reads an image file, downsizes it on a canvas, and returns a small JPEG
// data URL — keeps uploaded photos from blowing past localStorage's quota.
// Shared by my-dna-render.js (ASSETS tab) and new-ip.js (cover image).
function bearipResizeImageToDataUrl(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('이미지를 읽지 못했어요'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('이미지를 불러오지 못했어요'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
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
