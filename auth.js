// ===== Auth helpers (Firebase + Google OAuth) =====

let auth = null;

function initAuth() {
  if (window.location.protocol === 'file:') return Promise.resolve(true);
  if (!firebaseConfig || !firebaseConfig.apiKey) return Promise.resolve(true);
  if (auth) return Promise.resolve(true);

  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

  // Wait for auth state to resolve
  return new Promise((resolve) => {
    const unsub = auth.onAuthStateChanged(() => {
      unsub();
      resolve(true);
    });
  });
}

async function requireAuth() {
  if (window.location.protocol === 'file:') return;
  if (!firebaseConfig || !firebaseConfig.apiKey) return;

  await initAuth();
  if (!auth.currentUser) {
    window.location.href = 'index.html';
  }
}

async function signInWithGoogle() {
  if (!auth) await initAuth();
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
    window.location.href = 'dashboard.html';
  } catch (e) {
    if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
      // User closed the popup, do nothing
    } else {
      showToast('Login failed: ' + e.message, 'error');
    }
  }
}

async function signOut() {
  if (!auth) return;
  await auth.signOut();
  window.location.href = 'index.html';
}
