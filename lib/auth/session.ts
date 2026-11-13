import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/constants";

export async function persistSessionToken(idToken: string): Promise<void> {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "No se pudo guardar la sesión.");
  }
}

export async function clearSessionToken(): Promise<void> {
  await fetch("/api/auth/session", { method: "DELETE" });
}

export { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS };
