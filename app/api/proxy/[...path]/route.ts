import { NextRequest, NextResponse } from "next/server";

const ALLOWED_PREFIXES = ["admin/", "api/"] as const;

function getConfig() {
  const baseUrl = process.env.DEPORTIX_API_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.ADMIN_API_KEY;

  if (!baseUrl) {
    throw new Error("DEPORTIX_API_BASE_URL is not configured");
  }
  if (!apiKey) {
    throw new Error("ADMIN_API_KEY is not configured");
  }

  return { baseUrl, apiKey };
}

function assertAllowedPath(path: string) {
  if (!ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
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

    if (path.startsWith("admin/")) {
      headers.set("x-admin-api-key", apiKey);
    }

    const init: RequestInit = {
      method: request.method,
      headers,
      cache: "no-store",
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = await request.text();
    }

    const upstream = await fetch(target, init);
    const body = await upstream.text();

    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
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
