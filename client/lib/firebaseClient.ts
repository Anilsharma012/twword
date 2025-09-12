import { initializeApp } from "firebase/app";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Avoid duplicate initialization when firebase is already initialized elsewhere
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig as any);

export const auth = getAuth(app);
export { RecaptchaVerifier, signInWithPhoneNumber };
