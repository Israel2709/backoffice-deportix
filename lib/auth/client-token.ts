import {
  getFirebaseAuth,
  isFirebaseClientConfigured,
} from "@/lib/firebase/client";
import { ID_TOKEN_HEADER } from "@/lib/auth/constants";

/**
 * Fresh Firebase ID token for BO → proxy → API writes.
 * Do not rely on the httpOnly session cookie as Bearer: JWTs in cookies often
 * get mangled and fail API `verifyIdToken`.
 */
export async function getClientIdToken(
  forceRefresh = false,
): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!isFirebaseClientConfigured()) return null;

  const user = getFirebaseAuth().currentUser;
  if (!user) return null;

  try {
    return await user.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

/** Headers to attach on mutating proxy calls. */
export async function authHeadersForMutation(): Promise<Record<string, string>> {
  // Force refresh reduces "invalid/expired" right after login/race with cookie.
  let idToken = await getClientIdToken(true);
  if (!idToken) {
    idToken = await getClientIdToken(false);
  }
  if (!idToken) return {};

  return {
    Authorization: `Bearer ${idToken}`,
    [ID_TOKEN_HEADER]: idToken,
  };
}
