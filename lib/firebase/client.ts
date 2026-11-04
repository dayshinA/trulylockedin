import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserPopupRedirectResolver,
  inMemoryPersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";

// Client SDK is used only for Firebase Auth sign-in (admin login, member
// sign-in). All data reads/writes go through the server (Admin SDK).
// NEXT_PUBLIC_* must be referenced literally so Next inlines them at build time.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function clientApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

// In-memory persistence: the httpOnly session cookie is the only session, so
// nothing is kept in browser storage. Set at initialisation rather than with
// setPersistence() before each sign-in, so signInWithPopup can run straight
// from the click (an await before it lets Safari block the popup).
// initializeAuth returns the existing instance when called again with the
// same options.
export function clientAuth(): Auth {
  return initializeAuth(clientApp(), {
    persistence: inMemoryPersistence,
    popupRedirectResolver: browserPopupRedirectResolver,
  });
}
