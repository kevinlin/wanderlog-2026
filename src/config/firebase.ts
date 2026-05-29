import { type FirebaseApp, initializeApp } from 'firebase/app';
import { enableIndexedDbPersistence, type Firestore, getFirestore } from 'firebase/firestore';

// Support both Vite (import.meta.env) and Node.js (process.env) environments
const getEnvVar = (viteKey: string): string | undefined => {
  // Check Vite environment first (browser)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[viteKey] as string | undefined;
  }
  // Fall back to process.env (Node.js scripts)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[viteKey];
  }
  return;
};

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID'),
};

let app: FirebaseApp;
let db: Firestore;

/**
 * Initialize Firebase app and Firestore
 * Should be called once at app startup
 */
export const initializeFirebase = (): { app: FirebaseApp; db: Firestore } | null => {
  try {
    if (!app && firebaseConfig.apiKey) {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
    }
    return app ? { app, db } : null;
  } catch (error) {
    console.warn('Firebase initialization failed (expected in static hosting):', error);
    return null;
  }
};

/**
 * Get the Firebase app instance
 * Initializes if not already initialized
 */
export const getApp = (): FirebaseApp => {
  if (!app) {
    const result = initializeFirebase();
    if (result === null) throw new Error('Firebase not available — no API key configured');
    return result.app;
  }
  return app;
};

/**
 * Get the Firestore database instance
 * Initializes if not already initialized
 */
export const getDb = (): Firestore => {
  if (!db) {
    const result = initializeFirebase();
    if (result === null) throw new Error('Firebase not available — no API key configured');
    return result.db;
  }
  return db;
};

/**
 * Enable offline persistence for Firestore
 * This allows the app to work offline and sync when back online
 *
 * Should be called early in the app initialization
 * Will fail silently if:
 * - Multiple tabs are open (only one tab can have persistence enabled)
 * - Browser doesn't support IndexedDB
 */
export const enableOffline = async (): Promise<boolean> => {
  try {
    const firestore = getDb();
    await enableIndexedDbPersistence(firestore);
    console.log('✓ Firebase offline persistence enabled');
    return true;
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };

    if (error.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.warn('Firebase offline persistence failed: Multiple tabs open. Only one tab can have persistence enabled.');
    } else if (error.code === 'unimplemented') {
      // Browser doesn't support IndexedDB
      console.warn("Firebase offline persistence failed: Browser doesn't support all necessary features.");
    } else {
      console.warn('Firebase offline persistence failed:', error.message || error);
    }

    return false;
  }
};

// Export initialized instances for convenience
export { app, db };
