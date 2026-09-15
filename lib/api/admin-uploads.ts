import { proxyRequest } from "./proxy-client";

export function uploadAdminImage(body: {
  content_type: string;
  file_base64: string;
  folder?: string;
  filename?: string;
}): Promise<{
  data: {
    url: string;
    storage_path: string;
    content_type: string;
    size: number;
  };
}> {
  return proxyRequest("admin/uploads/image", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}
