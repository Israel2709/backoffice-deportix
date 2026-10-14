import { NextRequest, NextResponse } from "next/server";

/** Paths allowed to be forwarded to the MVP Deportix API. */
const ALLOWED_PREFIXES = [
  "v1/",
  "countries",
  "organizations",
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

/** Deployed MVP API — default for Vercel and when env is unset. */
const PRODUCTION_API_BASE_URL = "https://deportix-api.vercel.app";

function resolveApiBaseUrl(): string {
  const configured = process.env.DEPORTIX_API_BASE_URL?.replace(/\/$/, "").trim();
  if (!configured) return PRODUCTION_API_BASE_URL;

  // Vercel must never call localhost (common misconfig from copying .env.local).
  const onVercel = Boolean(process.env.VERCEL);
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(
    configured,
  );
  if (onVercel && isLocalhost) return PRODUCTION_API_BASE_URL;

  return configured;
}

function getConfig() {
  const baseUrl = resolveApiBaseUrl();
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
    // Admin BO must see writes immediately; bypass Vercel CDN copies of BFF GETs.
    if (request.method === "GET" || request.method === "HEAD") {
      headers.set("cache-control", "no-cache");
      headers.set("pragma", "no-cache");
    }

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

    // 204/205 must not include a body (empty string still counts as one).
    if (upstream.status === 204 || upstream.status === 205) {
      return new NextResponse(null, { status: upstream.status });
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
