// Shared Firebase connection for cross-device data (notifications, 제작요청,
// 전문가검토 — see storage.js's "Firebase-backed cross-device data" section).
// Loaded via the compat SDK (plain <script> tags, no bundler) before
// storage.js on every page, so `firebase` is a ready global by the time
// storage.js's functions are actually called.
//
// Realtime Database is currently in test-mode rules (open read/write) — fine
// for private link-sharing while this is still a prototype, but tighten the
// rules before treating this as a public launch.
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
