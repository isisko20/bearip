// Shared localStorage-backed store for BEARIP IPs (prototype only, no backend).
const BEARIP_IPS_KEY = 'bearip_ips';
const BEARIP_CURRENT_KEY = 'bearip_current_ip';

// ---- Per-account scoping ----
// Login here is nickname-only (no backend/passwords — see bearipGetUser
// below), but everything a creator would think of as genuinely "mine" (MY
// DNA's own IPs, credits, applied positions, portfolio) still needs to
// differ per nickname, or switching accounts on the same browser just shows
// the previous nickname's data back. Admin queues that are meant to
// aggregate every creator's requests for GM (제작요청/전문가검토) and public
// listings (CREW MATCH postings, content comments) are deliberately left
// un-scoped/global.
function bearipScopeSuffix() {
  const user = typeof bearipGetUser === 'function' ? bearipGetUser() : null;
  return user && user.nickname ? user.nickname : '_guest';
}

function bearipScopedKey(baseKey) {
  return baseKey + '::' + bearipScopeSuffix();
}

// Before this, every nickname silently shared one bucket per key. The first
// nickname to touch a given key after this change inherits that old shared
// value instead of finding it empty; every other/new nickname starts fresh.
// GM is excluded — it's a fixed admin nickname (see irIsGm in ip-reviews.js)
// that only reviews other creators' IPs, so it must never inherit whichever
// creator's leftover data happened to still be sitting in the old bucket.
function bearipMigrateLegacyKey(baseKey) {
  const scoped = bearipScopedKey(baseKey);
  if (bearipScopeSuffix() === 'GM') return scoped;
  if (localStorage.getItem(scoped) === null) {
    const legacy = localStorage.getItem(baseKey);
    if (legacy !== null) {
      localStorage.setItem(scoped, legacy);
      localStorage.removeItem(baseKey);
    }
  }
  return scoped;
}

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
  const n = parseInt(localStorage.getItem(bearipMigrateLegacyKey(BEARIP_CREDITS_KEY)), 10);
  return Number.isFinite(n) ? n : 0;
}

function bearipSetCredits(amount) {
  localStorage.setItem(bearipScopedKey(BEARIP_CREDITS_KEY), String(Math.max(0, amount)));
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
    { key: 'cover', label: '표지<br>디자인' },
    { key: 'upload', label: '업로드/<br>연재' },
  ],
  video: [
    { key: 'story', label: '시나리오' },
    { key: 'character', label: '캐릭터/<br>컨셉 디자인' },
    { key: 'visual', label: '톤앤매너/<br>비주얼 가이드' },
    { key: 'storyboard', label: '스토리보드' },
    { key: 'art', label: '촬영/제작' },
    { key: 'lettering', label: '편집/<br>사운드' },
    { key: 'cover', label: '썸네일/<br>포스터' },
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
    { key: 'cover', label: '표지/<br>썸네일 디자인' },
    { key: 'upload', label: '멀티<br>배포' },
  ],
};

// Example placeholder copy for the material-registration entry's 제목/메모
// fields — shown as ordinary greyed-out placeholder text (never a real
// value), so a creator sees what's actually useful to write for THIS kind of
// step instead of one generic hint for every step. Same key set as
// BEARIP_ROADMAP_STEP_PRICE below.
const BEARIP_STEP_MATERIAL_HINTS = {
  story: { label: '예: 1화, 시놉시스', note: '예: 주요 줄거리, 등장인물 관계, 핵심 사건을 적어주세요' },
  character: { label: '예: 주인공 이름', note: '예: 외형 특징, 성격, 말투, 다른 캐릭터와의 관계를 적어주세요' },
  visual: { label: '예: 톤앤매너 가이드', note: '예: 색감, 분위기, 참고하고 싶은 작품이나 레퍼런스를 적어주세요' },
  background: { label: '예: 학교 옥상, 밤거리', note: '예: 등장하는 시간대, 분위기, 등장 빈도를 적어주세요' },
  storyboard: { label: '예: 1화 콘티', note: '예: 컷 구성, 연출 의도, 강조하고 싶은 장면을 적어주세요' },
  art: { label: '예: 1화 원고', note: '예: 작업 진행 상태, 톤, 참고하고 싶은 작화 스타일을 적어주세요' },
  lettering: { label: '예: 1화 대사', note: '예: 폰트, 말풍선 스타일, 교정이 필요한 부분을 적어주세요' },
  cover: { label: '예: 메인 표지 시안', note: '예: 원하는 분위기, 인물 배치, 로고/타이틀 유무를 적어주세요' },
  upload: { label: '예: 업로드 완료 화면', note: '예: 업로드 플랫폼, 공개 일정을 적어주세요' },
};

function bearipStepMaterialHint(stepKey) {
  return BEARIP_STEP_MATERIAL_HINTS[stepKey] || { label: '예: 1화, 설정 자료', note: '간단한 설명이나 메모 (선택)' };
}

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
  cover: 45,
  upload: 20,
};

// Flat credit cost for 전문가 검토 요청 (asking the page-admin/GM to score a
// step's already-registered material), regardless of which step it is —
// this is feedback on existing work, not commissioning new work, so it's
// deliberately cheap and uniform rather than using BEARIP_ROADMAP_STEP_PRICE
// (that's the much pricier "make this for me" 제작요청 rate).
const BEARIP_EXPERT_REVIEW_PRICE = 15;

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
    // Self-heal: an earlier version of the per-account migration above could
    // have already handed GM someone else's leftover IPs before the GM
    // exclusion existed. GM never legitimately owns an IP, so wipe it out
    // instead of leaving a phantom project on screen.
    if (bearipScopeSuffix() === 'GM') {
      const gmKey = bearipScopedKey(BEARIP_IPS_KEY);
      if (localStorage.getItem(gmKey) !== null) {
        localStorage.removeItem(gmKey);
        localStorage.removeItem(bearipScopedKey(BEARIP_CURRENT_KEY));
        localStorage.removeItem(bearipScopedKey(BEARIP_FEATURED_KEY));
      }
      return [];
    }
    const raw = localStorage.getItem(bearipMigrateLegacyKey(BEARIP_IPS_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// A submission's fileData (roadmap-step 문서/음향) is read inline as a data
// URL so it can travel through Firebase to GM on a different device — see
// the comment above BEARIP_MAX_INLINE_FILE_BYTES further down. That's fine
// for Firebase (RTDB has real headroom), but this SAME value also lands in
// this browser's own localStorage copy of every IP the account owns —
// several IPs' worth of attachments can push that combined blob past
// localStorage's ~5-10MB per-origin quota even though each individual file
// stays under its own 5MB cap. bearipSyncIpForGm/bearipSetIpPublic (called
// right after bearipSaveIPs, from bearipAddIP/bearipUpdateIP below) are
// always given the original, un-stripped `ips`/`ip` argument — so this only
// trims what THIS browser duplicates locally, moving the bytes into
// IndexedDB (the same file store the ASSETS tab already uses) as a local
// cache instead of leaving them inline in the localStorage JSON.
const BEARIP_LOCAL_INLINE_LIMIT_BYTES = 200 * 1024; // 200KB

function bearipDataUrlToBlob(dataUrl) {
  const comma = dataUrl.indexOf(',');
  const meta = dataUrl.slice(0, comma);
  const mimeMatch = /^data:(.*?)(;base64)?$/.exec(meta);
  const mime = (mimeMatch && mimeMatch[1]) || 'application/octet-stream';
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// Pure — returns `ips` itself when nothing needs offloading, otherwise a
// shallow-cloned-where-touched copy, so the caller's own in-memory objects
// (and whatever it hands to the Firebase sync calls right after) are never
// mutated by this.
function bearipOffloadLocalSubmissionBlobs(ips) {
  let anyChanged = false;
  const out = ips.map((ip) => {
    let ipChanged = false;
    // sourceSubmissionId -> blobId, so a step.submission and the matching
    // ASSETS-tab mirror it produced (mdSyncStepAssetsFromSubmissions, in
    // my-dna-render.js) end up pointing at the SAME IndexedDB record
    // instead of each storing their own full copy of the same file.
    const blobIdBySubmissionId = {};

    let roadmap = ip.roadmap;
    if (Array.isArray(ip.roadmap)) {
      roadmap = ip.roadmap.map((step) => {
        if (!Array.isArray(step.submissions) || !step.submissions.length) return step;
        let stepChanged = false;
        const submissions = step.submissions.map((sub) => {
          if (typeof sub.fileData !== 'string' || sub.fileData.length <= BEARIP_LOCAL_INLINE_LIMIT_BYTES) return sub;
          const blobId = sub.blobId || 'sub_' + (sub.id || Math.random().toString(36).slice(2)) + '_file';
          try {
            bearipSaveAssetFile(blobId, bearipDataUrlToBlob(sub.fileData)).catch(() => {});
          } catch (e) {
            return sub; // couldn't parse — leave it inline rather than lose it
          }
          stepChanged = true;
          if (sub.id) blobIdBySubmissionId[sub.id] = blobId;
          return Object.assign({}, sub, { fileData: null, blobStored: true, blobId });
        });
        if (!stepChanged) return step;
        ipChanged = true;
        return Object.assign({}, step, { submissions });
      });
    }

    let assets = ip.assets;
    if (Array.isArray(ip.assets) && ip.assets.length) {
      let assetsChanged = false;
      assets = ip.assets.map((asset) => {
        const mirroredBlobId = asset.sourceSubmissionId && blobIdBySubmissionId[asset.sourceSubmissionId];
        if (mirroredBlobId && (asset.fileData || asset.blobId !== mirroredBlobId)) {
          assetsChanged = true;
          return Object.assign({}, asset, { fileData: null, blobStored: true, blobId: mirroredBlobId });
        }
        if (typeof asset.fileData !== 'string' || asset.fileData.length <= BEARIP_LOCAL_INLINE_LIMIT_BYTES) return asset;
        const blobId = asset.blobId || asset.id;
        try {
          bearipSaveAssetFile(blobId, bearipDataUrlToBlob(asset.fileData)).catch(() => {});
        } catch (e) {
          return asset;
        }
        assetsChanged = true;
        return Object.assign({}, asset, { fileData: null, blobStored: true, blobId });
      });
      if (assetsChanged) ipChanged = true;
    }

    if (!ipChanged) return ip;
    anyChanged = true;
    const clone = Object.assign({}, ip);
    if (roadmap !== ip.roadmap) clone.roadmap = roadmap;
    if (assets !== ip.assets) clone.assets = assets;
    return clone;
  });
  return anyChanged ? out : ips;
}

function bearipSaveIPs(ips) {
  const localSafe = bearipOffloadLocalSubmissionBlobs(ips);
  localStorage.setItem(bearipScopedKey(BEARIP_IPS_KEY), JSON.stringify(localSafe));
}

function bearipAddIP(ip) {
  // Recorded from the start (not just on publish) so GM's full-IP feed
  // (bearipSyncIpForGm) can always say whose IP it is.
  if (!ip.ownerNickname) ip.ownerNickname = bearipScopeSuffix();
  const ips = bearipLoadIPs();
  ips.unshift(ip);
  bearipSaveIPs(ips);
  localStorage.setItem(bearipScopedKey(BEARIP_CURRENT_KEY), ip.id);
  if (typeof bearipSyncIpForGm === 'function') bearipSyncIpForGm(ip);
  return ip;
}

function bearipUpdateIP(id, patch) {
  const ips = bearipLoadIPs();
  const idx = ips.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  ips[idx] = Object.assign({}, ips[idx], patch);
  bearipSaveIPs(ips);
  // Keep the public snapshot (bearipSetIpPublic, below) fresh on every edit
  // — not just the initial publish — so "공개" doesn't freeze the IP at
  // whatever it looked like the moment it was first made public.
  if (ips[idx].visibility === 'public' && typeof bearipSetIpPublic === 'function') {
    bearipSetIpPublic(ips[idx], true);
  }
  // GM's full feed (제작 시뮬레이션) mirrors every IP regardless of
  // visibility — separate from the public-only snapshot above.
  if (typeof bearipSyncIpForGm === 'function') bearipSyncIpForGm(ips[idx]);
  return ips[idx];
}

function bearipDeleteIP(id) {
  const ip = bearipLoadIPs().find((i) => i.id === id);
  bearipSaveIPs(bearipLoadIPs().filter((i) => i.id !== id));
  // bearipGetCurrentIP/bearipGetFeaturedId already treat an id with no
  // matching IP as "none", but clearing these outright avoids a stale id
  // silently pointing at nothing.
  if (localStorage.getItem(bearipMigrateLegacyKey(BEARIP_CURRENT_KEY)) === id) {
    localStorage.removeItem(bearipScopedKey(BEARIP_CURRENT_KEY));
  }
  if (bearipGetFeaturedId() === id) {
    bearipSetFeaturedId(null);
  }
  if (bearipFirebaseReady()) {
    firebase.database().ref('allIPs/' + id).remove();
    firebase.database().ref('publicIPs/' + id).remove();
    firebase.database().ref('ipOverallComments/' + id).remove();
    // 제작요청/전문가검토 큐는 이 IP를 참조만 할 뿐 담고 있지는 않아서, IP가
    // 삭제돼도 저절로 같이 사라지지 않는다 — 안 지우면 GM 쪽에 실체 없는
    // 요청/검토 건이 유령처럼 계속 남는다 (실제로 겪은 문제라 여기서 막는다).
    if (typeof bearipLoadProductionRequests === 'function' && typeof bearipDeleteProductionRequest === 'function') {
      bearipLoadProductionRequests()
        .filter((r) => r.ipId === id)
        .forEach((r) => bearipDeleteProductionRequest(r.id));
    }
    if (typeof bearipLoadIpReviews === 'function' && typeof bearipDeleteIpReview === 'function') {
      bearipLoadIpReviews()
        .filter((r) => r.ipId === id)
        .forEach((r) => bearipDeleteIpReview(r.id));
    }
  }
  if (!ip) return;

  // Any roadmap submission or ASSETS-tab file moved out to this browser's
  // IndexedDB (bearipOffloadLocalSubmissionBlobs / addAssetFromUpload) has
  // nothing left pointing at it once the IP itself is gone — clean those up
  // too instead of leaving them as permanent local storage waste.
  if (typeof bearipDeleteAssetFile === 'function') {
    (ip.roadmap || []).forEach((step) => {
      (step.submissions || []).forEach((sub) => {
        if (sub.blobId) bearipDeleteAssetFile(sub.blobId);
      });
    });
    (ip.assets || []).forEach((asset) => {
      if (asset.blobStored) bearipDeleteAssetFile(asset.blobId || asset.id);
    });
  }

  // A CREW MATCH posting only exists to recruit for this IP, and an
  // applicant record only exists to apply to one of those postings — both
  // are meaningless (and, now that postings are visible to everyone, publicly
  // confusing) once the IP itself is gone. Postings made before ipId was
  // recorded only know their IP by title, so fall back to that for those.
  const me = bearipScopeSuffix();
  bearipLoadPositions()
    .filter((p) => p.ownerNickname === me && (p.ipId ? p.ipId === id : p.ipTitle === ip.title))
    .forEach((p) => bearipDeletePosition(p.id));
  // Same for requests to join it, and its followers.
  bearipDeleteJoinRequestsForIp(id);
  bearipDeleteFollowersForIp(id);
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
// pattern as bearipEnsureDnaBreakdown above. Also defaults `targetCount`
// (how many entries "counts as done" for that step — e.g. 총 10화) to 1 for
// any step that doesn't have one yet, so a lone registered item still reads
// as 100% exactly like it did before targetCount existed.
function bearipEnsureRoadmapSubmissions(ip) {
  if (!ip || !Array.isArray(ip.roadmap)) return;
  let migrated = false;
  ip.roadmap.forEach((step) => {
    if (!Array.isArray(step.submissions)) {
      if (step.submission) {
        step.submissions = [Object.assign({ id: 'legacy' }, step.submission)];
      } else {
        step.submissions = [];
      }
      delete step.submission;
      migrated = true;
    }
    if (!step.targetCount) {
      step.targetCount = 1;
      migrated = true;
    }
  });
  if (migrated && ip.id && ip.id !== 'demo') bearipUpdateIP(ip.id, { roadmap: ip.roadmap });
}

// How complete a single roadmap step is, as a % — registered entries out of
// its target count (e.g. 4/10화 = 40%), capped at 100 so extra entries past
// the target don't overflow the bar/number.
function bearipStepCompletionPercent(step) {
  // 제작 요청은 아무 자료도 등록하지 않은 '미등록' 상태에서 바로 전문가에게
  // 통째로 맡길 수도 있다 — 그렇게 완성된 단계(제작 완료/직접 완료)까지 등록한
  // 자료 개수로만 % 를 매기면, 실제로는 다 끝난 단계가 0%로 보여서 "완성됐다"는
  // 신호와 어긋난다. 어떻게 완성됐든 완성은 완성이니 100%로 취급한다.
  if (step.mode === 'done' || step.mode === 'self_done') return 100;
  const target = step.targetCount || 1;
  const count = (step.submissions || []).length;
  return Math.max(0, Math.min(100, Math.round((count / target) * 100)));
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
  const id = localStorage.getItem(bearipMigrateLegacyKey(BEARIP_CURRENT_KEY));
  if (!id) return null;
  return bearipLoadIPs().find((i) => i.id === id) || null;
}

function bearipSetCurrentId(id) {
  localStorage.setItem(bearipScopedKey(BEARIP_CURRENT_KEY), id);
}

// ---- "대표 프로젝트" — separate from bearip_current_ip (which is just
// "whichever IP MY DNA is showing right now"). This is a deliberate pick the
// creator makes from the IP switcher list; only one IP can be featured at a
// time, so setting a new one silently replaces whichever was featured before.
const BEARIP_FEATURED_KEY = 'bearip_featured_ip';

function bearipGetFeaturedId() {
  try {
    return localStorage.getItem(bearipMigrateLegacyKey(BEARIP_FEATURED_KEY));
  } catch (e) {
    return null;
  }
}

function bearipSetFeaturedId(id) {
  try {
    if (id) localStorage.setItem(bearipScopedKey(BEARIP_FEATURED_KEY), id);
    else localStorage.removeItem(bearipScopedKey(BEARIP_FEATURED_KEY));
  } catch (e) {
    /* ignore */
  }
}

// ---- CREW MATCH recruiting posts + applicants ----
// Firebase-backed (positions/<id>, positionApplicants/<positionId>/<nickname>)
// like publicIPs/publicCreators — these used to be plain localStorage, so a
// posting only ever existed in the poster's own browser and nobody else could
// see it, apply to it, or have their application reach the poster. Reads stay
// synchronous off the live cache (see _bearipWatchPath); callers that should
// redraw when someone else's change arrives register with
// bearipOnDataChange('positions' | 'positionApplicants', fn). Writes update
// the cache immediately too, so a same-tick read after a write sees it even
// before Firebase echoes it back.
function bearipEscapeAttr(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function bearipLoadPositions() {
  return _bearipMapToArray(_bearipDataCache.positions, 'createdAt');
}

function bearipAddPosition(position) {
  if (!position.ownerNickname) position.ownerNickname = bearipScopeSuffix();
  _bearipDataCache.positions[position.id] = position;
  if (bearipFirebaseReady()) {
    _bearipFirebaseWrite(() => firebase.database().ref('positions/' + position.id).set(bearipFirebaseSafe(position)));
  }
  return position;
}

function bearipUpdatePosition(id, patch) {
  const current = _bearipDataCache.positions[id];
  if (!current) return null;
  const merged = Object.assign({}, current, patch);
  _bearipDataCache.positions[id] = merged;
  if (bearipFirebaseReady()) {
    _bearipFirebaseWrite(() => firebase.database().ref('positions/' + id).update(bearipFirebaseSafe(patch)));
  }
  return Object.assign({ id }, merged);
}

// Applicants are keyed by nickname (one application per person per posting,
// same "one per name" rule the old local list enforced) — the key doubles as
// the applicant's id everywhere they get rendered.
function bearipApplicantKey(name) {
  return bearipSafePathSegment(name);
}

function bearipGetApplicants(positionId) {
  const map = _bearipDataCache.positionApplicants[positionId] || {};
  return Object.keys(map)
    .map((key) => Object.assign({}, map[key], { id: key }))
    .sort((a, b) => new Date(a.appliedAt || 0) - new Date(b.appliedAt || 0));
}

function bearipAddApplicant(positionId, applicant) {
  const key = bearipApplicantKey(applicant.name);
  const record = Object.assign({}, applicant, { id: key });
  const byPosition = (_bearipDataCache.positionApplicants[positionId] = _bearipDataCache.positionApplicants[positionId] || {});
  byPosition[key] = record;
  if (bearipFirebaseReady()) {
    _bearipFirebaseWrite(() =>
      firebase.database().ref('positionApplicants/' + positionId + '/' + key).set(bearipFirebaseSafe(record))
    );
  }
  return record;
}

function bearipRemoveApplicantByName(positionId, name) {
  const key = bearipApplicantKey(name);
  if (_bearipDataCache.positionApplicants[positionId]) delete _bearipDataCache.positionApplicants[positionId][key];
  if (bearipFirebaseReady()) firebase.database().ref('positionApplicants/' + positionId + '/' + key).remove();
}

function bearipUpdateApplicantStatus(positionId, applicantId, status) {
  const byPosition = _bearipDataCache.positionApplicants[positionId] || {};
  const current = byPosition[applicantId];
  if (!current) return null;
  byPosition[applicantId] = Object.assign({}, current, { status });
  if (bearipFirebaseReady()) {
    _bearipFirebaseWrite(() =>
      firebase.database().ref('positionApplicants/' + positionId + '/' + applicantId + '/status').set(status)
    );
  }
  return Object.assign({}, byPosition[applicantId], { id: applicantId });
}

// The current user's own application to a posting (null if none) — the source
// of truth for what an apply button should say, instead of a local "did I
// click it" flag that could never know about the owner's accept/reject.
function bearipMyApplication(positionId) {
  const user = bearipGetUser();
  if (!user) return null;
  return bearipGetApplicants(positionId).find((a) => a.name === user.nickname) || null;
}

function bearipMyAppliedPositionIds() {
  const user = bearipGetUser();
  if (!user) return [];
  const key = bearipApplicantKey(user.nickname);
  return Object.keys(_bearipDataCache.positionApplicants).filter(
    (posId) => _bearipDataCache.positions[posId] && (_bearipDataCache.positionApplicants[posId] || {})[key]
  );
}

// What an apply button should show/do for the current user on this posting.
// One definition for CREW MATCH's card and IP detail's recruit list.
function bearipApplyButtonState(pos) {
  const user = bearipGetUser();
  if (user && pos.ownerNickname === user.nickname) return { label: '내 모집글', disabled: true, kind: 'owner' };
  const mine = bearipMyApplication(pos.id);
  if (!mine) return { label: '지원하기', disabled: false, kind: 'none' };
  if (mine.status === 'accepted') return { label: '참여 중', disabled: true, kind: 'accepted' };
  if (mine.status === 'rejected') return { label: '거절됨', disabled: true, kind: 'rejected' };
  return { label: '지원 취소', disabled: false, kind: 'pending' };
}

// Applying also tells the posting's owner — before, the "notification" only
// ever went to the applicant themself, so the person who could act on it
// never heard about it.
function bearipApplyToPosition(pos, message) {
  const user = bearipGetUser();
  if (!user) return null;
  const visiblePortfolio = bearipLoadPortfolio().filter((p) => p.visibility !== 'private').length;
  const record = bearipAddApplicant(pos.id, {
    name: user.nickname,
    role: bearipGetMyPositions()[0] || '',
    bio: user.bio || '',
    portfolioCount: visiblePortfolio,
    message: message || '',
    appliedAt: new Date().toISOString(),
    status: 'pending',
  });
  const label = `${pos.ipTitle} · ${pos.role}`;
  bearipAddNotification({
    type: 'crew',
    title: '포지션에 지원했어요',
    message: `${label}에 지원했어요. 결과를 기다려주세요.`,
    link: 'profile.html',
  });
  if (pos.ownerNickname && pos.ownerNickname !== user.nickname) {
    bearipAddNotification(
      { type: 'crew', title: '새 지원자가 있어요', message: `${user.nickname}님이 '${label}'에 지원했어요.`, link: 'crew-applicants.html' },
      pos.ownerNickname
    );
  }
  return record;
}

// Accept/reject, shared by CREW MATCH's card panel, 지원자 관리, and MY DNA's
// applicant alert — and now tells the applicant the outcome (the status
// change alone was invisible to them until they happened to reopen the page).
function bearipDecideApplicant(positionId, applicantId, accepting) {
  const updated = bearipUpdateApplicantStatus(positionId, applicantId, accepting ? 'accepted' : 'rejected');
  if (!updated) return null;
  const pos = _bearipDataCache.positions[positionId];
  if (accepting && pos) bearipUpdatePosition(positionId, { filled: Math.min((pos.filled || 0) + 1, pos.count || 1) });
  const label = pos ? `${pos.ipTitle} · ${pos.role}` : '포지션';
  bearipAddNotification(
    {
      type: 'crew',
      title: accepting ? '지원이 수락됐어요' : '지원 결과가 나왔어요',
      message: accepting ? `'${label}' 지원이 수락됐어요. 크루로 함께해요!` : `'${label}' 지원이 이번에는 받아들여지지 않았어요.`,
      link: 'crew-match.html',
    },
    updated.name
  );
  return updated;
}

function bearipDeletePosition(id) {
  bearipGetApplicants(id).forEach((a) => bearipRemoveApplicantByName(id, a.name));
  delete _bearipDataCache.positions[id];
  if (bearipFirebaseReady()) firebase.database().ref('positions/' + id).remove();
}

// ---- IP 참여 신청 (ip-detail.html's 참여하기) ----
// ipJoinRequests/<ipId>/<nickname> in Firebase — same shape as position
// applicants. This used to be a local "joined" flag that only ever flipped a
// button in the requester's own browser (plus a notification to themself), so
// the IP's owner never knew and could never say yes. Keyed by IP id, so an
// owner finds their requests by their own IP ids without needing anything
// else to be recorded on the IP.
function bearipGetJoinRequests(ipId) {
  const map = _bearipDataCache.ipJoinRequests[ipId] || {};
  return Object.keys(map)
    .map((key) => Object.assign({}, map[key], { id: key }))
    .sort((a, b) => new Date(a.requestedAt || 0) - new Date(b.requestedAt || 0));
}

function bearipMyJoinRequest(ipId) {
  const user = bearipGetUser();
  if (!user) return null;
  return bearipGetJoinRequests(ipId).find((r) => r.name === user.nickname) || null;
}

// Every request the current user has sent, across all IPs (newest first).
function bearipMyJoinRequests() {
  const user = bearipGetUser();
  if (!user) return [];
  const key = bearipApplicantKey(user.nickname);
  return Object.keys(_bearipDataCache.ipJoinRequests)
    .map((ipId) => (_bearipDataCache.ipJoinRequests[ipId] || {})[key] && Object.assign({}, _bearipDataCache.ipJoinRequests[ipId][key], { id: key }))
    .filter(Boolean)
    .sort((a, b) => new Date(b.requestedAt || 0) - new Date(a.requestedAt || 0));
}

function _bearipJoinRef(ipId, key) {
  return firebase.database().ref('ipJoinRequests/' + ipId + '/' + key);
}

// What 참여하기 should show/do for the current user on this IP. ip.ownerNickname
// may be missing on very old IPs — an IP that's in the viewer's own local list
// is theirs regardless.
function bearipJoinButtonState(ip) {
  const user = bearipGetUser();
  const isOwn = !!(user && ((ip.ownerNickname && ip.ownerNickname === user.nickname) || bearipLoadIPs().some((i) => i.id === ip.id)));
  if (isOwn) return { label: '내 IP', disabled: true, kind: 'owner' };
  const mine = bearipMyJoinRequest(ip.id);
  if (!mine) return { label: '참여하기', disabled: false, kind: 'none' };
  if (mine.status === 'accepted') return { label: '참여 중', disabled: true, kind: 'accepted' };
  if (mine.status === 'rejected') return { label: '거절됨', disabled: true, kind: 'rejected' };
  return { label: '참여 신청 취소', disabled: false, kind: 'pending' };
}

function bearipRequestToJoinIp(ip, message) {
  const user = bearipGetUser();
  if (!user || !ip || !ip.id) return null;
  const key = bearipApplicantKey(user.nickname);
  const record = {
    id: key,
    name: user.nickname,
    ipId: ip.id,
    ipTitle: ip.title || '',
    ownerNickname: ip.ownerNickname || '',
    bio: user.bio || '',
    message: message || '',
    requestedAt: new Date().toISOString(),
    status: 'pending',
  };
  (_bearipDataCache.ipJoinRequests[ip.id] = _bearipDataCache.ipJoinRequests[ip.id] || {})[key] = record;
  if (bearipFirebaseReady()) _bearipFirebaseWrite(() => _bearipJoinRef(ip.id, key).set(bearipFirebaseSafe(record)));
  bearipAddNotification({
    type: 'crew',
    title: 'IP 참여를 신청했어요',
    message: `'${ip.title}'에 참여 신청을 보냈어요. 오너의 승인을 기다려주세요.`,
    link: 'profile.html',
  });
  if (ip.ownerNickname && ip.ownerNickname !== user.nickname) {
    bearipAddNotification(
      { type: 'crew', title: 'IP 참여 신청이 왔어요', message: `${user.nickname}님이 '${ip.title}'에 참여하고 싶어해요.`, link: 'crew-applicants.html' },
      ip.ownerNickname
    );
  }
  return record;
}

function bearipCancelJoinRequest(ipId) {
  const user = bearipGetUser();
  if (!user) return;
  const key = bearipApplicantKey(user.nickname);
  if (_bearipDataCache.ipJoinRequests[ipId]) delete _bearipDataCache.ipJoinRequests[ipId][key];
  if (bearipFirebaseReady()) _bearipJoinRef(ipId, key).remove();
}

// Owner accepts/rejects a request; the requester is told the outcome.
function bearipDecideJoinRequest(ipId, requestId, accepting) {
  const byIp = _bearipDataCache.ipJoinRequests[ipId] || {};
  const current = byIp[requestId];
  if (!current) return null;
  const status = accepting ? 'accepted' : 'rejected';
  byIp[requestId] = Object.assign({}, current, { status });
  if (bearipFirebaseReady()) _bearipFirebaseWrite(() => _bearipJoinRef(ipId, requestId + '/status').set(status));
  const title = current.ipTitle || 'IP';
  bearipAddNotification(
    {
      type: 'crew',
      title: accepting ? 'IP 참여가 승인됐어요' : 'IP 참여 결과가 나왔어요',
      message: accepting ? `'${title}'에 크루로 합류했어요!` : `'${title}' 참여 신청이 이번에는 받아들여지지 않았어요.`,
      link: 'profile.html',
    },
    current.name
  );
  return Object.assign({}, byIp[requestId], { id: requestId });
}

function bearipDeleteJoinRequestsForIp(ipId) {
  bearipGetJoinRequests(ipId).forEach((r) => {
    if (bearipFirebaseReady()) _bearipJoinRef(ipId, r.id).remove();
  });
  delete _bearipDataCache.ipJoinRequests[ipId];
}

// ---- IP 팔로우 ----
// ipFollowers/<ipId>/<nickname> in Firebase — used to be a per-browser flag
// (bearip_followed_ips) with a follower count that was always a hardcoded 0,
// since nothing ever counted across devices. Unlike 참여하기, following has no
// owner approval step — it's just a visible "I follow this" list.
function bearipGetFollowers(ipId) {
  const map = _bearipDataCache.ipFollowers[ipId] || {};
  return Object.keys(map).map((key) => Object.assign({}, map[key], { id: key }));
}

function bearipFollowerCount(ipId) {
  return Object.keys(_bearipDataCache.ipFollowers[ipId] || {}).length;
}

function bearipIsFollowingIp(ipId) {
  const user = bearipGetUser();
  if (!user) return false;
  return !!(_bearipDataCache.ipFollowers[ipId] || {})[bearipApplicantKey(user.nickname)];
}

function _bearipFollowRef(ipId, key) {
  return firebase.database().ref('ipFollowers/' + ipId + '/' + key);
}

function bearipFollowIp(ip) {
  const user = bearipGetUser();
  if (!user || !ip || !ip.id) return;
  const key = bearipApplicantKey(user.nickname);
  const record = { name: user.nickname, followedAt: new Date().toISOString() };
  (_bearipDataCache.ipFollowers[ip.id] = _bearipDataCache.ipFollowers[ip.id] || {})[key] = record;
  if (bearipFirebaseReady()) _bearipFirebaseWrite(() => _bearipFollowRef(ip.id, key).set(bearipFirebaseSafe(record)));
}

function bearipUnfollowIp(ipId) {
  const user = bearipGetUser();
  if (!user) return;
  const key = bearipApplicantKey(user.nickname);
  if (_bearipDataCache.ipFollowers[ipId]) delete _bearipDataCache.ipFollowers[ipId][key];
  if (bearipFirebaseReady()) _bearipFollowRef(ipId, key).remove();
}

function bearipDeleteFollowersForIp(ipId) {
  bearipGetFollowers(ipId).forEach((f) => {
    if (bearipFirebaseReady()) _bearipFollowRef(ipId, f.id).remove();
  });
  delete _bearipDataCache.ipFollowers[ipId];
}

// ---- 고아 데이터 점검 (GM) ----
// bearipDeleteIP cleans up everything it knows to when an IP is deleted, but
// that safety net has grown collection by collection over time — anything
// deleted before a given cleanup existed (or through some path that missed
// it) is still out there, referencing an IP id nothing can resolve anymore.
// GM-only sweep, manually triggered (not automatic — this is real data,
// worth a look before deleting, unlike the age-based notification prune
// above). Requires GM's client, since only it watches allIPs.
function bearipScanOrphans() {
  const allIps = bearipLoadAllIPsForGm();
  const idSet = new Set(allIps.map((ip) => ip.id));
  const titleSet = new Set(allIps.map((ip) => ip.title));
  const belongsToKnownIp = (ipId, ipTitle) => (ipId ? idSet.has(ipId) : titleSet.has(ipTitle));

  const posIdSet = new Set(bearipLoadPositions().map((p) => p.id));

  return {
    ipOverallComments: Object.keys(_bearipDataCache.ipOverallComments || {}).filter((id) => !idSet.has(id)),
    productionRequests: bearipLoadProductionRequests()
      .filter((r) => !belongsToKnownIp(r.ipId, null))
      .map((r) => r.id),
    ipReviews: bearipLoadIpReviews()
      .filter((r) => !belongsToKnownIp(r.ipId, null))
      .map((r) => r.id),
    positions: bearipLoadPositions()
      .filter((p) => !belongsToKnownIp(p.ipId, p.ipTitle))
      .map((p) => p.id),
    ipJoinRequests: Object.keys(_bearipDataCache.ipJoinRequests || {}).filter((id) => !idSet.has(id)),
    ipFollowers: Object.keys(_bearipDataCache.ipFollowers || {}).filter((id) => !idSet.has(id)),
    positionApplicants: Object.keys(_bearipDataCache.positionApplicants || {}).filter((posId) => !posIdSet.has(posId)),
  };
}

function bearipOrphanCount(report) {
  return Object.values(report).reduce((sum, list) => sum + list.length, 0);
}

function bearipCleanupOrphans(report) {
  if (!bearipFirebaseReady()) return;
  report.ipOverallComments.forEach((id) => firebase.database().ref('ipOverallComments/' + id).remove());
  report.productionRequests.forEach((id) => bearipDeleteProductionRequest(id));
  report.ipReviews.forEach((id) => bearipDeleteIpReview(id));
  report.positions.forEach((id) => bearipDeletePosition(id));
  report.ipJoinRequests.forEach((id) => bearipDeleteJoinRequestsForIp(id));
  report.ipFollowers.forEach((id) => bearipDeleteFollowersForIp(id));
  // Deletes each applicant individually, not the whole positionApplicants/
  // <posId> node — the rules only grant write at the applicant level (same
  // "no collection-root wipe" shape as every other collection here), and the
  // position itself is already gone, so bearipDeletePosition isn't it either.
  report.positionApplicants.forEach((posId) => {
    bearipGetApplicants(posId).forEach((a) => bearipRemoveApplicantByName(posId, a.name));
    delete _bearipDataCache.positionApplicants[posId];
  });
}

// ---- Firebase-backed cross-device data ----
// Everything above is deliberately per-browser (localStorage) — MY DNA's own
// IPs, credits, portfolio. But 제작요청/전문가검토/알림 only make sense if the
// person fulfilling them (GM, or a Creator) is a different person on a
// different device than whoever requested them — localStorage alone can
// never deliver that. These three (plus the small 종합 코멘트 field GM leaves
// per IP) live in Firebase Realtime Database instead, loaded via a plain
// <script> tag (firebase-init.js) before this file on every page.
//
// Reads stay synchronous like every other bearipLoad*() here: a live
// listener keeps an in-memory cache current, so callers don't need to learn
// async. A renderer that should redraw the moment fresh data arrives (not
// just on next page load) should register with bearipOnDataChange(kind, fn).
function bearipFirebaseReady() {
  return typeof firebase !== 'undefined' && !!firebase.apps && firebase.apps.length > 0;
}

// Realtime Database path segments can't contain . # $ [ ] / — nicknames are
// free-typed (see login.js), so sanitize before using one as a path key.
function bearipSafePathSegment(str) {
  return String(str || '').replace(/[.#$[\]/]/g, '_') || '_guest';
}

const _bearipDataCache = { notifications: {}, productionRequests: {}, ipReviews: {}, ipOverallComments: {}, publicIPs: {}, allIPs: {}, publicCreators: {}, positions: {}, positionApplicants: {}, ipJoinRequests: {}, ipFollowers: {} };
const _bearipDataListeners = { notifications: [], productionRequests: [], ipReviews: [], ipOverallComments: [], publicIPs: [], allIPs: [], publicCreators: [], positions: [], positionApplicants: [], ipJoinRequests: [], ipFollowers: [] };
// Firebase's first 'value' callback for a watched path can take a real
// moment to arrive (network round-trip, larger the more attachments have
// piled up) — until then _bearipDataCache[kind] is just its empty starting
// {}, indistinguishable from "genuinely no requests yet". A page that reads
// bearipLoadProductionRequests()/bearipLoadIpReviews() etc. before this
// flips true and shows a flat "없어요" empty state ends up lying to GM —
// looking permanently broken instead of just still loading.
const _bearipDataLoaded = { notifications: false, productionRequests: false, ipReviews: false, ipOverallComments: false, publicIPs: false, allIPs: false, publicCreators: false, positions: false, positionApplicants: false, ipJoinRequests: false, ipFollowers: false };

function bearipIsDataLoaded(kind) {
  return !!_bearipDataLoaded[kind];
}

function bearipOnDataChange(kind, fn) {
  if (_bearipDataListeners[kind]) _bearipDataListeners[kind].push(fn);
}

function _bearipNotifyListeners(kind) {
  (_bearipDataListeners[kind] || []).forEach((fn) => {
    try {
      fn();
    } catch (e) {
      /* one broken listener shouldn't break the rest */
    }
  });
}

function _bearipWatchPath(kind, path) {
  if (!bearipFirebaseReady()) return;
  firebase
    .database()
    .ref(path)
    .on('value', (snap) => {
      _bearipDataCache[kind] = snap.val() || {};
      _bearipDataLoaded[kind] = true;
      _bearipNotifyListeners(kind);
    });
}

function _bearipMapToArray(map, sortField) {
  return Object.keys(map || {})
    .map((id) => Object.assign({ id }, map[id]))
    .sort((a, b) => new Date(b[sortField] || 0) - new Date(a[sortField] || 0));
}

// Firebase rejects any value containing `undefined` outright — its .set()/
// .update() throw *synchronously*, not just an async rejection — and IP/
// request objects built elsewhere routinely carry optional fields left as
// `undefined` (e.g. no cover image chosen). Drops those keys instead of
// erroring, so one missing optional field can't crash whatever local flow
// (creating an IP, sending a request) triggered this background sync.
//
// Walks the object graph directly rather than JSON.stringify + JSON.parse —
// an IP can carry several MB of inline base64 (a registered 음향/문서 file),
// and round-tripping that much text through the JSON parser on every save
// was slow enough on modest hardware to look like the page had frozen.
// Recursing like this touches every key but only *references* string/number/
// boolean values instead of re-serializing them character by character.
function bearipFirebaseSafe(value) {
  if (value === undefined) return null;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => bearipFirebaseSafe(v));
  const out = {};
  Object.keys(value).forEach((k) => {
    if (value[k] === undefined) return;
    out[k] = bearipFirebaseSafe(value[k]);
  });
  return out;
}

// Wraps a Firebase .set()/.update() call so it can never throw into the
// caller — this is always a best-effort background sync, never something
// worth breaking a local save over.
function _bearipFirebaseWrite(fn) {
  try {
    fn();
  } catch (e) {
    /* best-effort background sync */
  }
}

// ---- 제작요청 — a global queue (every creator's requests, one place) so
// whoever fulfills them (GM) can see and close them out from any device, and
// so the requester sees the result back on theirs. Kept separate from the
// IP's own self/requested mode flag; my-dna-render.js's mdReconcileRemoteStatus
// pulls the outcome back onto the requester's own local IP once it lands
// here, since GM's device has no access to that IP's local data anymore.
function bearipLoadProductionRequests() {
  return _bearipMapToArray(_bearipDataCache.productionRequests, 'requestedAt');
}

function bearipAddProductionRequest(req) {
  if (!bearipFirebaseReady()) return req;
  const id = req.id || 'preq_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const record = Object.assign({}, req);
  delete record.id; // id is the RTDB key itself, not a field inside the record
  _bearipFirebaseWrite(() => firebase.database().ref('productionRequests/' + id).set(bearipFirebaseSafe(record)));
  return Object.assign({ id }, record);
}

function bearipUpdateProductionRequest(id, patch) {
  if (!bearipFirebaseReady()) return null;
  _bearipFirebaseWrite(() => firebase.database().ref('productionRequests/' + id).update(bearipFirebaseSafe(patch)));
  return Object.assign({ id }, (_bearipDataCache.productionRequests || {})[id], patch);
}

// Lets the requester clear a request out of their own 제작요청 history once
// they're done with it (완료/거절 건 확인 후 정리 등) — there's no separate
// per-viewer visibility flag, so this removes the shared record outright.
function bearipDeleteProductionRequest(id) {
  if (!bearipFirebaseReady()) return;
  firebase.database().ref('productionRequests/' + id).remove();
}

// Shared by production-requests.js (GM's own list) and my-dna-render.js (the
// requester's 제작요청 tab) so a result file GM uploads on 완료 처리 renders the
// same way in both places: an image opens full-size in a new tab, audio
// plays inline, anything else downloads. classPrefix lets each page supply
// its own CSS (e.g. 'pr-result' vs 'md-production-result').
function bearipRenderResultFileHtml(r, classPrefix) {
  if (!r.resultImageData && !r.resultFileData && !r.resultFileName && !r.resultLink) return '';
  const esc = typeof bearipEscapeHtml === 'function' ? bearipEscapeHtml : (s) => s;
  const fileMeta = r.resultFileSize ? ` · ${Math.max(1, Math.round(r.resultFileSize / 1024))}KB` : '';
  if (r.resultImageData) {
    return `<a class="${classPrefix}-thumb" href="${r.resultImageData}" target="_blank" rel="noopener" style="background-image:url('${r.resultImageData}')" title="눌러서 크게 보기"></a>`;
  }
  const isAudio = r.resultMime && r.resultMime.startsWith('audio/');
  const isVideo = r.resultMime && r.resultMime.startsWith('video/');
  if (r.resultFileData && isAudio) {
    return `<div class="${classPrefix}-audio"><div class="${classPrefix}-file plain">${esc(r.resultFileName)}${fileMeta}</div><audio controls preload="metadata" src="${r.resultFileData}"></audio></div>`;
  }
  if (r.resultFileData && isVideo) {
    return `<div class="${classPrefix}-audio"><div class="${classPrefix}-file plain">${esc(r.resultFileName)}${fileMeta}</div><video controls preload="metadata" src="${r.resultFileData}"></video></div>`;
  }
  if (r.resultFileData) {
    return `<a class="${classPrefix}-file" href="${r.resultFileData}" download="${esc(r.resultFileName)}" target="_blank" rel="noopener">${esc(r.resultFileName)}${fileMeta}</a>`;
  }
  // 영상처럼 5MB 인라인 한도를 넘는 결과물은 파일 대신 링크(구글드라이브 등)로
  // 전달된다 — Firebase RTDB/브라우저 로컬 저장 어느 쪽에도 큰 바이너리를
  // 통째로 넣을 방법이 없어, 실제 호스팅은 외부에 맡기고 이 앱은 링크만 들고
  // 있는 것.
  if (r.resultLink) {
    return `<a class="${classPrefix}-file" href="${esc(r.resultLink)}" target="_blank" rel="noopener">결과물 링크 열기 →</a>`;
  }
  return `<div class="${classPrefix}-file plain">${esc(r.resultFileName)}${fileMeta}</div>`;
}

// ---- IP 심사(전문가 검토) 요청 — same reasoning as 제작요청 above: a global
// queue GM works through from any device, with the outcome pulled back onto
// the requester's own local IP by mdReconcileRemoteStatus.
function bearipLoadIpReviews() {
  return _bearipMapToArray(_bearipDataCache.ipReviews, 'requestedAt');
}

// A step's submissions may have had large fileData moved out to this
// browser's own IndexedDB cache (bearipOffloadLocalSubmissionBlobs, above —
// only the LOCAL localStorage copy is trimmed, never what's handed to a
// Firebase write). But `step.submissions` here could itself be a copy that
// was loaded from that already-trimmed local storage in an earlier session
// (e.g. currentIP loaded once at page open, then reused for an unrelated
// save later) — so anything about to cross into Firebase needs to resolve
// those references back to real bytes first, or GM reviewing from a
// different device would see an empty attachment. Best-effort: a
// submission that can't be rehydrated (rare — IndexedDB failure) still goes
// out with its filename/metadata intact rather than blocking the request.
async function bearipHydrateSubmissionsForRemote(submissions) {
  if (!Array.isArray(submissions) || !submissions.length) return submissions;
  if (!submissions.some((s) => s.blobStored && s.blobId && !s.fileData)) return submissions;
  return Promise.all(
    submissions.map(async (sub) => {
      if (!sub.blobStored || !sub.blobId || sub.fileData) return sub;
      try {
        const record = await bearipGetAssetFile(sub.blobId);
        if (record && record.blob) {
          const dataUrl = await bearipReadFileAsDataUrl(record.blob);
          return Object.assign({}, sub, { fileData: dataUrl });
        }
      } catch (e) {}
      return sub;
    })
  );
}

async function bearipHydrateIpForRemote(ip) {
  if (!ip || !Array.isArray(ip.roadmap)) return ip;
  const roadmap = await Promise.all(
    ip.roadmap.map(async (step) => {
      if (!Array.isArray(step.submissions) || !step.submissions.length) return step;
      const submissions = await bearipHydrateSubmissionsForRemote(step.submissions);
      return submissions === step.submissions ? step : Object.assign({}, step, { submissions });
    })
  );
  return Object.assign({}, ip, { roadmap });
}

function bearipAddIpReview(review) {
  if (!bearipFirebaseReady()) return review;
  const id = review.id || 'ipreview_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const record = Object.assign({}, review);
  delete record.id;
  bearipHydrateSubmissionsForRemote(record.submissions).then((submissions) => {
    const toWrite = submissions === record.submissions ? record : Object.assign({}, record, { submissions });
    _bearipFirebaseWrite(() => firebase.database().ref('ipReviews/' + id).set(bearipFirebaseSafe(toWrite)));
  });
  return Object.assign({ id }, record);
}

function bearipUpdateIpReview(id, patch) {
  if (!bearipFirebaseReady()) return null;
  _bearipFirebaseWrite(() => firebase.database().ref('ipReviews/' + id).update(bearipFirebaseSafe(patch)));
  return Object.assign({ id }, (_bearipDataCache.ipReviews || {})[id], patch);
}

// GM's own permanent delete (from 휴지통) — distinct from a soft "trashed"
// patch via bearipUpdateIpReview, which is what 휴지통으로 이동/복구 use.
function bearipDeleteIpReview(id) {
  if (!bearipFirebaseReady()) return;
  firebase.database().ref('ipReviews/' + id).remove();
}

// ---- 종합 코멘트 — one IP-wide comment GM can leave (ip-reviews.js), shown
// back on MY DNA (my-dna-render.js). Was stored on the IP object itself,
// which only worked while every account shared one localStorage bucket.
function bearipGetIpOverallComment(ipId) {
  return (_bearipDataCache.ipOverallComments || {})[ipId] || '';
}

function bearipSetIpOverallComment(ipId, comment) {
  if (!bearipFirebaseReady()) return;
  const ref = firebase.database().ref('ipOverallComments/' + ipId);
  if (comment) ref.set(comment);
  else ref.remove();
}

// ---- Published IPs — MY DNA's own IP data is otherwise local-only (see the
// per-account scoping above), so without this, "OPEN DNA에 공개하기" only
// ever showed up in the SAME browser that published it. A snapshot of the IP
// goes here the moment its owner publishes it, and is removed the moment
// they unpublish; open-dna-published.js reads this list instead of the
// local one so a small friend group actually sees each other's public IPs.
function bearipLoadPublicIPs() {
  return Object.values(_bearipDataCache.publicIPs || {});
}

function bearipSetIpPublic(ip, isPublic) {
  if (!bearipFirebaseReady() || !ip || !ip.id) return;
  const ref = firebase.database().ref('publicIPs/' + ip.id);
  if (isPublic) {
    bearipHydrateIpForRemote(ip).then((hydrated) => _bearipFirebaseWrite(() => ref.set(bearipFirebaseSafe(hydrated))));
  } else ref.remove();
}

// ---- GM-only: every IP regardless of publish status — a 제작요청/전문가검토
// record only carries the one step/item that was submitted, not the whole
// IP, so GM has no way to see the rest of it for 제작 시뮬레이션. Every IP
// syncs here on every save (bearipAddIP/bearipUpdateIP, below), separate
// from bearipSetIpPublic's public-only snapshot above — regular creators
// still only ever see what others have actually published; only GM's own
// client subscribes to this feed at all (see bearipInitFirebaseWatchers).
function bearipSyncIpForGm(ip) {
  if (!bearipFirebaseReady() || !ip || !ip.id) return;
  bearipHydrateIpForRemote(ip).then((hydrated) =>
    _bearipFirebaseWrite(() => firebase.database().ref('allIPs/' + ip.id).set(bearipFirebaseSafe(hydrated)))
  );
}

function bearipLoadAllIPsForGm() {
  return Object.values(_bearipDataCache.allIPs || {});
}

// What the OPEN DNA / DNA ROOM / CONTENT ROOM published-IP grids should
// actually render: everything for GM (제작 시뮬레이션), otherwise just what's
// genuinely public. GM's view is allIPs UNION publicIPs, not allIPs alone —
// an IP published before allIPs syncing existed (or momentarily out of sync)
// still needs to show up for GM as long as it's in publicIPs.
function bearipLoadBrowsableIPs() {
  const user = typeof bearipGetUser === 'function' ? bearipGetUser() : null;
  if (!user || user.nickname !== 'GM') return bearipLoadPublicIPs();
  const byId = {};
  bearipLoadPublicIPs().forEach((ip) => {
    byId[ip.id] = ip;
  });
  bearipLoadAllIPsForGm().forEach((ip) => {
    byId[ip.id] = ip;
  });
  return Object.values(byId);
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
    const raw = localStorage.getItem(bearipMigrateLegacyKey(BEARIP_MY_POSITIONS_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function bearipSetMyPositions(list) {
  localStorage.setItem(bearipScopedKey(BEARIP_MY_POSITIONS_KEY), JSON.stringify(list));
}

// ---- CREW MATCH's "크리에이터 둘러보기" — profile.html's "가능한 포지션" tab
// promises that filling it in makes you findable here; without this, that
// promise was empty (positions/portfolio never left this browser's own
// localStorage). Mirrors bearipSetIpPublic's snapshot-on-save pattern below:
// a public record goes to publicCreators/<nickname> whenever the profile
// owner has at least one position selected, and is removed the moment they
// clear their positions — no positions selected means "not looking," same
// as never having opted in.
function bearipLoadPublicCreators() {
  return Object.values(_bearipDataCache.publicCreators || {});
}

function bearipSyncMyCreatorProfile() {
  if (!bearipFirebaseReady()) return;
  const user = bearipGetUser();
  if (!user || !user.nickname) return;
  const positions = bearipGetMyPositions();
  const ref = firebase.database().ref('publicCreators/' + bearipSafePathSegment(user.nickname));
  if (!positions.length) {
    ref.remove();
    return;
  }
  const ips = typeof bearipLoadIPs === 'function' ? bearipLoadIPs() : [];
  // Only "항시 공개" portfolio pieces belong in a passive browse list — "지원
  // 할 때 공개" items are meant to surface at the moment this person applies
  // to something, not to every stranger scrolling CREW MATCH.
  const portfolio = bearipLoadPortfolio()
    .filter((p) => p.visibility === 'always')
    .map((p) => ({ id: p.id, title: p.title, thumb: p.thumb }));
  const snapshot = {
    nickname: user.nickname,
    bio: user.bio || '',
    positions,
    portfolio,
    cheers: ips.reduce((sum, ip) => sum + (ip.likes || 0), 0),
    joinedAt: user.joinedAt || null,
    updatedAt: new Date().toISOString(),
  };
  _bearipFirebaseWrite(() => ref.set(bearipFirebaseSafe(snapshot)));
}

function bearipLoadPortfolio() {
  try {
    const raw = localStorage.getItem(bearipMigrateLegacyKey(BEARIP_PORTFOLIO_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function bearipSavePortfolio(list) {
  localStorage.setItem(bearipScopedKey(BEARIP_PORTFOLIO_KEY), JSON.stringify(list));
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
// proposed creators — anywhere a button just needs an on/off toggle that
// survives reload, keyed by a namespaced localStorage key. Every caller's key
// so far (bearip_joined_ips, ...) is personal ("things I did"), so this is
// scoped per account like the rest of MY DNA's own data.
function bearipSetList(key) {
  try {
    return JSON.parse(localStorage.getItem(bearipMigrateLegacyKey(key))) || [];
  } catch (e) {
    return [];
  }
}

function bearipSetHas(key, id) {
  try {
    const arr = JSON.parse(localStorage.getItem(bearipMigrateLegacyKey(key))) || [];
    return arr.includes(id);
  } catch (e) {
    return false;
  }
}

// Toggles membership and returns the new state (true = now in the set).
function bearipSetToggle(key, id) {
  let arr;
  try {
    arr = JSON.parse(localStorage.getItem(bearipMigrateLegacyKey(key))) || [];
  } catch (e) {
    arr = [];
  }
  const has = arr.includes(id);
  arr = has ? arr.filter((x) => x !== id) : arr.concat([id]);
  localStorage.setItem(bearipScopedKey(key), JSON.stringify(arr));
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

// ---- Notifications — personal, so kept under each nickname's own Firebase
// path (notifications/<nick>/<id>) rather than the global queues above. This
// is what lets GM's action on a different device actually reach the right
// person's bell icon — see bearipAddNotification's targetNickname.
function bearipNotificationsPath(nickname) {
  return 'notifications/' + bearipSafePathSegment(nickname || bearipScopeSuffix());
}

function bearipLoadNotifications() {
  return _bearipMapToArray(_bearipDataCache.notifications, 'createdAt');
}

// targetNickname defaults to whoever's currently logged in (self-notifying
// about your own action, the common case); pass it explicitly to deliver to
// someone else, e.g. GM notifying the original requester.
function bearipAddNotification(notif, targetNickname) {
  if (!bearipFirebaseReady()) return;
  const id = 'ntf_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  const record = Object.assign({ read: false, createdAt: new Date().toISOString() }, notif);
  _bearipFirebaseWrite(() => firebase.database().ref(bearipNotificationsPath(targetNickname) + '/' + id).set(bearipFirebaseSafe(record)));
}

function bearipGetUnreadCount() {
  return bearipLoadNotifications().filter((n) => !n.read).length;
}

function bearipMarkAllNotificationsRead() {
  if (!bearipFirebaseReady()) return;
  const updates = {};
  bearipLoadNotifications().forEach((n) => {
    if (!n.read) updates[n.id + '/read'] = true;
  });
  if (Object.keys(updates).length) _bearipFirebaseWrite(() => firebase.database().ref(bearipNotificationsPath()).update(updates));
}

function bearipMarkNotificationRead(id) {
  if (!bearipFirebaseReady()) return;
  _bearipFirebaseWrite(() => firebase.database().ref(bearipNotificationsPath() + '/' + id + '/read').set(true));
}

// Read notifications older than this just sit there forever otherwise —
// nobody re-reads a month-old "지원했어요" toast, and the list was only ever
// going to grow. Unread notifications are never touched, no matter how old;
// only something the person has already seen and dismissed gets swept.
const BEARIP_NOTIF_MAX_AGE_DAYS = 30;
let _bearipNotifPruneChecked = false;

// Runs at most once per nickname per day (a localStorage timestamp, not a
// server job — there's no backend to run one on) and only after the live
// notifications cache has actually loaded, so it never mistakes "still
// loading" for "nothing to prune". Wired to bearipOnDataChange('notifications',
// ...) near the bottom of this file, so it fires on every page once real data
// arrives.
function bearipPruneOldNotificationsIfDue() {
  if (_bearipNotifPruneChecked) return;
  if (!bearipIsDataLoaded('notifications')) return;
  _bearipNotifPruneChecked = true;
  if (!bearipFirebaseReady()) return;
  const user = bearipGetUser();
  if (!user) return;
  const throttleKey = bearipScopedKey('bearip_notif_pruned_at');
  const now = Date.now();
  const last = Number(localStorage.getItem(throttleKey) || 0);
  if (now - last < 24 * 60 * 60 * 1000) return;
  localStorage.setItem(throttleKey, String(now));
  const cutoff = now - BEARIP_NOTIF_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  bearipLoadNotifications()
    .filter((n) => n.read && new Date(n.createdAt).getTime() < cutoff)
    .forEach((n) => firebase.database().ref(bearipNotificationsPath() + '/' + n.id).remove());
}

// Lets a "click to upload" zone (a container with its own file input +
// existing click/change handlers) also accept drag-and-drop — dropping a
// file just puts it on the SAME input and re-fires its 'change' event, so
// every zone's own validation/handling runs exactly as it already does for
// a normal click-to-browse upload, with nothing duplicated here.
function bearipEnableFileDrop(zoneEl, inputEl) {
  if (!zoneEl || !inputEl) return;
  zoneEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    zoneEl.classList.add('drag-over');
  });
  zoneEl.addEventListener('dragleave', () => zoneEl.classList.remove('drag-over'));
  zoneEl.addEventListener('drop', (e) => {
    e.preventDefault();
    zoneEl.classList.remove('drag-over');
    const files = e.dataTransfer && e.dataTransfer.files;
    if (!files || !files.length) return;
    inputEl.files = files;
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

// Delegated variant for a list whose upload zones are re-created on every
// render (roadmap material entries) — bound once on the stable parent, same
// pattern already used there for click/change.
function bearipEnableFileDropDelegated(containerEl, zoneSelector) {
  if (!containerEl) return;
  containerEl.addEventListener('dragover', (e) => {
    const zone = e.target.closest(zoneSelector);
    if (!zone) return;
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  containerEl.addEventListener('dragleave', (e) => {
    const zone = e.target.closest(zoneSelector);
    if (zone) zone.classList.remove('drag-over');
  });
  containerEl.addEventListener('drop', (e) => {
    const zone = e.target.closest(zoneSelector);
    if (!zone) return;
    e.preventDefault();
    zone.classList.remove('drag-over');
    const files = e.dataTransfer && e.dataTransfer.files;
    const input = zone.querySelector('input[type="file"]');
    if (!files || !files.length || !input) return;
    input.files = files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
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

// A registered roadmap-step document or audio clip (시나리오 워드/PDF/텍스트,
// 음향 mp3/wav 등) needs to actually be openable/playable later — including by
// GM on a different device, once it's synced through Firebase with the rest
// of the IP — so it's read inline as a data URL here, the same way an image
// becomes its thumbnail above. Kept well under BEARIP_MAX_ASSET_FILE_BYTES
// (the IndexedDB-backed ASSETS tab's 50MB limit): this instead lands in the
// IP's own JSON (localStorage + Firebase), which has nowhere near that much
// headroom — a short mp3 fits fine, a raw WAV of more than a few seconds may
// not.
const BEARIP_MAX_INLINE_FILE_BYTES = 5 * 1024 * 1024; // 5MB — localStorage's own
// per-origin quota (separate from, and much smaller than, what navigator.
// storage.estimate() reports) is typically only ~5-10MB total, shared with
// every other IP/submission already saved there.

const BEARIP_INLINE_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

function bearipIsInlineAttachmentFile(file) {
  if (BEARIP_INLINE_FILE_TYPES.includes(file.type)) return true;
  if (file.type.startsWith('audio/')) return true;
  // Video is allowed inline too, but BEARIP_MAX_INLINE_FILE_BYTES (5MB) still
  // applies — a real produced clip almost always needs the 결과물 링크 field
  // instead (see bearipRenderResultFileHtml's resultLink branch below); this
  // only lets a short/small clip go inline like any other attachment.
  if (file.type.startsWith('video/')) return true;
  return /\.(pdf|docx?|txt|mp3|wav|mp4|mov|webm)$/i.test(file.name || '');
}

// Rough "is this an audio submission" check for rendering (<audio controls>
// vs a plain download link) — mime first, filename extension as a fallback
// for browsers that report an empty/generic type for less common formats.
function bearipIsAudioSubmission(sub) {
  if (sub.mime && sub.mime.startsWith('audio/')) return true;
  return /\.(mp3|wav)$/i.test(sub.fileName || '');
}

function bearipReadFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('파일을 읽지 못했어요'));
    reader.onload = () => resolve(reader.result);
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

// Notifications are personal (per nickname); 제작요청/전문가검토/종합 코멘트 are
// global queues GM (or any viewer) needs to see in full. Run once per page
// load — nickname changes always go through a full page reload (see
// bearipSetUser's callers), so there's no live-switch case to handle here.
(function bearipInitFirebaseWatchers() {
  if (!bearipFirebaseReady()) return;
  _bearipWatchPath('notifications', bearipNotificationsPath());
  _bearipWatchPath('productionRequests', 'productionRequests');
  _bearipWatchPath('ipReviews', 'ipReviews');
  _bearipWatchPath('ipOverallComments', 'ipOverallComments');
  _bearipWatchPath('publicIPs', 'publicIPs');
  // Only GM's own client pulls the full every-IP feed — everyone else's
  // gallery views only ever need (and only ever subscribe to) publicIPs.
  const _u = bearipGetUser();
  if (_u && _u.nickname === 'GM') _bearipWatchPath('allIPs', 'allIPs');
  _bearipWatchPath('publicCreators', 'publicCreators');
  _bearipWatchPath('positions', 'positions');
  _bearipWatchPath('positionApplicants', 'positionApplicants');
  _bearipWatchPath('ipJoinRequests', 'ipJoinRequests');
  _bearipWatchPath('ipFollowers', 'ipFollowers');
  bearipOnDataChange('notifications', bearipPruneOldNotificationsIfDue);
})();

// One-time move of any 모집글/지원자 this browser made back when they were
// localStorage-only. Only postings whose IP is one of the logged-in user's own
// IPs are claimed (the old local list wasn't per-account, so it can hold other
// nicknames' leftovers on a shared browser); the rest stay put untouched.
(function bearipMigrateLocalPositions() {
  if (!bearipFirebaseReady()) return;
  const user = bearipGetUser();
  if (!user || !user.nickname || user.nickname === 'GM') return;
  const doneKey = 'bearip_positions_migrated::' + user.nickname;
  if (localStorage.getItem(doneKey)) return;
  localStorage.setItem(doneKey, '1');
  let localPositions;
  let localApplicants;
  try {
    localPositions = JSON.parse(localStorage.getItem('bearip_positions') || '[]');
    localApplicants = JSON.parse(localStorage.getItem('bearip_position_applicants') || '{}');
  } catch (e) {
    return;
  }
  const myIps = bearipLoadIPs();
  const mine = localPositions.filter((p) => p && p.id && myIps.some((ip) => ip.title === p.ipTitle));
  if (!mine.length) return;
  mine.forEach((p) => {
    const ip = myIps.find((i) => i.title === p.ipTitle);
    bearipAddPosition(Object.assign({}, p, { ownerNickname: user.nickname, ipId: ip.id }));
    (localApplicants[p.id] || []).forEach((a) => bearipAddApplicant(p.id, a));
    delete localApplicants[p.id];
  });
  const movedIds = mine.map((p) => p.id);
  localStorage.setItem('bearip_positions', JSON.stringify(localPositions.filter((p) => !movedIds.includes(p.id))));
  localStorage.setItem('bearip_position_applicants', JSON.stringify(localApplicants));
})();
