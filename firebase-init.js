// Shared Firebase connection for cross-device data (notifications, 제작요청,
// 전문가검토 — see storage.js's "Firebase-backed cross-device data" section).
// Loaded via the compat SDK (plain <script> tags, no bundler) before
// storage.js on every page, so `firebase` is a ready global by the time
// storage.js's functions are actually called.
//
// Access rules live in database.rules.json (default-deny, each collection
// opened explicitly with shape checks). There's still no real sign-in, so they
// can't tell users apart — publish changes with `firebase deploy --only
// database`. A new top-level path used by storage.js needs a rule added there.
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
