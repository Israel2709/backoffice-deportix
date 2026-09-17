import { NextRequest, NextResponse } from "next/server";

/** Paths allowed to be forwarded to the MVP Deportix API. */
const ALLOWED_PREFIXES = [
  "v1/",
  "countries",
  "leagues",
  "teams",
  "fixtures",
  "standings",
  "american-football/",
  "formula-1/",
  "tennis/",
  // Legacy Express admin (local only) — keep for dual-mode if needed
  "admin/",
  "api/",
] as const;

function getConfig() {
  const baseUrl = process.env.DEPORTIX_API_BASE_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("DEPORTIX_API_BASE_URL is not configured");
  }
  // Optional — only used when forwarding legacy /admin/* to Express API
  const apiKey = process.env.ADMIN_API_KEY;
  return { baseUrl, apiKey };
}

function assertAllowedPath(path: string) {
  const ok = ALLOWED_PREFIXES.some(
    (prefix) => path === prefix.replace(/\/$/, "") || path.startsWith(prefix),
  );
  if (!ok) {
    throw new Error(`Path not allowed: ${path}`);
  }
}

async function forward(
  request: NextRequest,
  pathSegments: string[],
): Promise<NextResponse> {
  try {
    const { baseUrl, apiKey } = getConfig();
    const path = pathSegments.join("/");
    assertAllowedPath(path);

    const search = request.nextUrl.search;
    const target = `${baseUrl}/${path}${search}`;

    const headers = new Headers();
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    headers.set("accept", "application/json");

    if (path.startsWith("admin/") && apiKey) {
      headers.set("x-admin-api-key", apiKey);
    }

    const init: RequestInit = {
      method: request.method,
      headers,
      cache: "no-store",
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      // Preserve binary for multipart uploads
      if (contentType?.includes("multipart/form-data")) {
        init.body = await request.arrayBuffer();
      } else {
        init.body = await request.text();
      }
    }

    const upstream = await fetch(target, init);
    const body = await upstream.text();
    const upstreamType =
      upstream.headers.get("content-type") ?? "application/json";

    if (
      !upstream.ok &&
      (upstreamType.includes("text/html") ||
        body.trimStart().startsWith("<!") ||
        body.toLowerCase().includes("<html"))
    ) {
      return NextResponse.json(
        {
          error: `Upstream ${upstream.status} en ${target}. Ruta no encontrada en la API MVP.`,
        },
        { status: upstream.status === 404 ? 404 : 502 },
      );
    }

    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "content-type": upstreamType,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Proxy request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return forward(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return forward(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return forward(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return forward(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return forward(request, path);
}
