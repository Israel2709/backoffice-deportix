import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/**
 * Next.js only inlines `NEXT_PUBLIC_*` when accessed with a static property name
 * (`process.env.NEXT_PUBLIC_FOO`). Dynamic `process.env[name]` is undefined in the browser.
 */
function readPublicConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? "",
  };
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0]!;
    return app;
  }

  const { apiKey, authDomain, projectId } = readPublicConfig();
  if (!apiKey || !authDomain || !projectId) {
    throw new Error(
      "Missing NEXT_PUBLIC_FIREBASE_* config. Add Firebase web app config to .env.local (see .env.example) and restart `npm run dev`.",
    );
  }

  app = initializeApp({ apiKey, authDomain, projectId });
  return app;
}

export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  return auth;
}

export function isFirebaseClientConfigured(): boolean {
  const { apiKey, authDomain, projectId } = readPublicConfig();
  return Boolean(apiKey && authDomain && projectId);
}
