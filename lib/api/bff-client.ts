/**
 * Low-level helpers for the MVP Deportix API (api-sports BFF + /v1 envelopes).
 */

export type BffEnvelope<T> = {
  response?: T;
  results?: number;
  errors?: unknown;
  get?: string;
  parameters?: unknown;
  paging?: unknown;
};

export type V1Envelope<T> = {
  data: T;
  meta?: unknown;
};

export async function proxyRaw(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const isFormData =
    typeof FormData !== "undefined" &&
    init?.body != null &&
    init.body instanceof FormData;

  const headers = new Headers(init?.headers);
  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!isFormData && !headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  return fetch(`/api/proxy/${path.replace(/^\//, "")}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function proxyJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await proxyRaw(path, init);
  const text = await response.text();

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    const trimmed = text.trim();
    if (trimmed.startsWith("<!") || trimmed.toLowerCase().includes("<html")) {
      message = `La API respondió ${response.status} para /${path.replace(/^\//, "")}.`;
    } else {
      try {
        const parsed = JSON.parse(text) as {
          error?: string | { message?: string };
          errors?: unknown;
        };
        if (typeof parsed.error === "string") message = parsed.error;
        else if (parsed.error && typeof parsed.error === "object") {
          message = parsed.error.message ?? JSON.stringify(parsed.error);
        } else if (parsed.errors) {
          message = JSON.stringify(parsed.errors);
        } else if (trimmed) message = trimmed.slice(0, 280);
      } catch {
        if (trimmed) message = trimmed.slice(0, 280);
      }
    }
    throw new Error(message);
  }

  if (response.status === 204 || !text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

/** Unwrap `{ response: T }` BFF envelope (T may be array or scalar). */
export async function bffRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const body = await proxyJson<BffEnvelope<T>>(path, init);
  if (body == null) return undefined as T;
  if (Array.isArray(body.errors) && body.errors.length > 0) {
    throw new Error(JSON.stringify(body.errors));
  }
  if (body.errors && typeof body.errors === "object" && !Array.isArray(body.errors)) {
    const vals = Object.values(body.errors as Record<string, unknown>).filter(Boolean);
    if (vals.length) throw new Error(JSON.stringify(body.errors));
  }
  return body.response as T;
}

/** Unwrap `{ data: T }` v1 envelope. */
export async function v1Request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const body = await proxyJson<V1Envelope<T>>(path, init);
  if (body == null) return undefined as T;
  return body.data;
}
