/**
 * Upload an image to MVP `POST /v1/uploads` (multipart).
 * Fields: `file`, `purpose` (default `league_logo`).
 */
export async function uploadAdminImage(body: {
  file: File;
  purpose?: string;
  entityId?: string;
  /** @deprecated Ignored — use `file` FormData upload. */
  content_type?: string;
  /** @deprecated Ignored — use `file` FormData upload. */
  file_base64?: string;
  /** @deprecated Prefer `purpose`. */
  folder?: string;
  filename?: string;
}): Promise<{
  data: {
    url: string;
    storage_path?: string;
    content_type?: string;
    size?: number;
  };
}> {
  if (!body.file) {
    throw new Error("uploadAdminImage requires a File (multipart to v1/uploads).");
  }

  const form = new FormData();
  form.append("file", body.file, body.filename || body.file.name);
  form.append("purpose", body.purpose || body.folder || "league_logo");
  if (body.entityId) form.append("entityId", body.entityId);

  const response = await fetch("/api/proxy/v1/uploads", {
    method: "POST",
    body: form,
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) {
    let message = `Upload failed (${response.status})`;
    try {
      const parsed = JSON.parse(text) as {
        error?: string | { message?: string };
      };
      if (typeof parsed.error === "string") message = parsed.error;
      else if (parsed.error && typeof parsed.error === "object") {
        message = parsed.error.message ?? message;
      }
    } catch {
      if (text.trim()) message = text.trim().slice(0, 280);
    }
    throw new Error(message);
  }

  const parsed = JSON.parse(text) as { data: { url: string } };
  return { data: { url: parsed.data.url } };
}

/** @deprecated Prefer passing File to uploadAdminImage. Kept for callers that still encode. */
export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}
