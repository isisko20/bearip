// Shared Firebase connection for cross-device data (notifications, 제작요청,
// 전문가검토 — see storage.js's "Firebase-backed cross-device data" section).
// Loaded via the compat SDK (plain <script> tags, no bundler) before
// storage.js on every page, so `firebase` is a ready global by the time
// storage.js's functions are actually called.
//
// Access rules live in database.rules.json (default-deny, each collection
// opened explicitly with shape checks, now also requiring `auth != null`) —
// publish changes with `firebase deploy --only database`. A new top-level
// path used by storage.js needs a rule added there.
//
// Two kinds of Firebase identity exist now:
//  · Anonymous Auth (below) — just "some real Firebase-issued identity", so a
//    script hitting the database URL directly can't read or write without
//    authenticating through Firebase. Enough for the public, open data.
//  · A server login (storage.js's bearipAuthSignIn) — the authLogin function
//    checks the nickname's PIN and hands back a token whose nk/nick claims the
//    rules trust, which is what actually locks 쪽지·알림·신고 per person.
const firebaseConfig = {
  apiKey: 'AIzaSyBxIh-W6Clny96l_zwCWORBudA9uDqm2-M',
  authDomain: 'thinkit-ccb2e.firebaseapp.com',
  databaseURL: 'https://thinkit-ccb2e-default-rtdb.firebaseio.com',
  projectId: 'thinkit-ccb2e',
  storageBucket: 'thinkit-ccb2e.firebasestorage.app',
  messagingSenderId: '632387782659',
  appId: '1:632387782659:web:814409131c1ad43feb6636',
};

firebase.initializeApp(firebaseConfig);

// Fire-and-forget — every read/write already goes through bearipFirebaseReady()
// (storage.js), which now also waits for this to land, so nothing here needs
// to block page load on it. Persists across reloads via the SDK's own local
// persistence, so this only actually round-trips once per browser.
//
// Only sign in anonymously when NOBODY is signed in. signInAnonymously() would
// replace a server login (custom token) with a fresh anonymous user on every
// page load, so the first onAuthStateChanged callback — which fires once the
// saved session has been restored — decides.
const _bearipInitAuthUnsub = firebase.auth().onAuthStateChanged((user) => {
  _bearipInitAuthUnsub();
  if (user) return;
  firebase.auth().signInAnonymously().catch(() => {
    /* best-effort — a failed anonymous sign-in just means Firebase reads/
       writes stay disabled on this page load, same as being offline */
  });
});
