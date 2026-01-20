import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Try to get config from environment variables (Vite standard)
// or fallback to global variable if present (legacy support)
const firebaseConfig = import.meta.env.VITE_FIREBASE_CONFIG
    ? JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG)
    : (typeof window !== 'undefined' && window.__firebase_config ? JSON.parse(window.__firebase_config) : {});

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// App ID fallback
export const appId = import.meta.env.VITE_APP_ID ||
    (typeof window !== 'undefined' && window.__app_id ? window.__app_id : 'default-app-id');
