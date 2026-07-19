import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set, runTransaction, onValue } from "firebase/database";

// These come from your Firebase project settings > General > Your apps > SDK config.
// Stored in .env.local (see SETUP.md) — never commit real keys to git.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// ---- Room helpers (drop-in replacements for the artifact's window.storage calls) ----

export async function loadRoom(code) {
  try {
    const snap = await get(ref(db, `rooms/${code}`));
    return snap.exists() ? snap.val() : null;
  } catch (e) {
    console.error("loadRoom failed", e);
    return null;
  }
}

export async function saveRoom(code, data) {
  try {
    await set(ref(db, `rooms/${code}`), data);
  } catch (e) {
    console.error("saveRoom failed", e);
  }
}

// Safer read-modify-write for concurrent updates (e.g. both partners submitting
// an answer at the same moment). `updater` receives the latest room doc (or null
// if it doesn't exist yet) and returns the new room object to save. Realtime
// Database transactions may retry the updater a few times under contention —
// keep it pure (no side effects), which it already is.
export async function updateRoom(code, updater) {
  const roomRef = ref(db, `rooms/${code}`);
  const result = await runTransaction(roomRef, (latest) => updater(latest));
  return result.snapshot.val();
}

// Realtime subscription — fires immediately with the current value, then again
// on every change. Replaces the artifact's 2-second polling loop.
export function subscribeToRoom(code, callback) {
  const roomRef = ref(db, `rooms/${code}`);
  return onValue(roomRef, (snap) => {
    if (snap.exists()) callback(snap.val());
  });
}
