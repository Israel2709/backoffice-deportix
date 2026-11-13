import {
  getFirebaseAuth,
  isFirebaseClientConfigured,
} from "@/lib/firebase/client";

/**
 * Fresh Firebase ID token for BO → proxy → API writes.
 * Prefer this over the httpOnly cookie alone: cookies can mangle/truncate JWTs,
 * which surfaces as API `Invalid or expired authentication token`.
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
export async function authHeadersForMutation(): Promise<HeadersInit> {
  const idToken = await getClientIdToken(false);
  if (!idToken) return {};
  return { Authorization: `Bearer ${idToken}` };
}
