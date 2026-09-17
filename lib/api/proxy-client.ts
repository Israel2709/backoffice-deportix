async function proxyRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`/api/proxy/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    let message = `Request failed (${response.status})`;
    const trimmed = body.trim();
    if (trimmed.startsWith("<!") || trimmed.toLowerCase().includes("<html")) {
      message = `La API respondió ${response.status} (ruta no encontrada o HTML). Verifica DEPORTIX_API_BASE_URL y que el backend exponga /${path.replace(/^\//, "")}.`;
    } else {
      try {
        const parsed = JSON.parse(body) as { error?: unknown };
        if (typeof parsed.error === "string") message = parsed.error;
        else if (parsed.error) message = JSON.stringify(parsed.error);
        else if (trimmed) message = trimmed;
      } catch {
        if (trimmed) message = trimmed.slice(0, 280);
      }
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export { proxyRequest };
