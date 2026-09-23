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
// There's still no real per-user sign-in — nicknames are self-typed, not
// accounts (see storage.js's bearipGetUser) — so rules still can't tell one
// person from another. Anonymous Auth below exists only to require *some*
// real Firebase-issued identity behind a request, so a script hitting the
// database URL directly (bypassing this page and its JS entirely) can't
// read or write without first actually authenticating through Firebase.
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
// to block page load on it. Persists across reloads (same anonymous uid) via
// the SDK's own local persistence, so this only actually round-trips once per
// browser, not once per page view.
firebase.auth().signInAnonymously().catch(() => {
  /* best-effort — a failed anonymous sign-in just means Firebase reads/
     writes stay disabled on this page load, same as being offline */
});
