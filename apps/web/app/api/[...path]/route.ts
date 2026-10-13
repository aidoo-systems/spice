import { NextRequest, NextResponse } from "next/server";

const BACKEND = () => process.env.API_URL || "http://localhost:5000";

// Hop-by-hop and body-framing headers. The upstream fetch recomputes
// content-length from the forwarded body, and undici rejects `expect`
// (e.g. `Expect: 100-continue` from some HTTP clients) outright.
const STRIP_REQUEST = ["host", "connection", "expect", "content-length", "transfer-encoding"];
// fetch() already decoded the body, so its encoding/length no longer apply.
const STRIP_RESPONSE = ["connection", "content-encoding", "content-length", "transfer-encoding"];

async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  // Strip leading /api to get the backend path, e.g. /api/v1/suggest -> /v1/suggest
  const backendPath = pathname.replace(/^\/api/, "");
  const url = `${BACKEND()}${backendPath}${search}`;

  // X-Forwarded-For passes through untouched: the API trusts only the entry
  // our edge proxy appended (see TRUSTED_PROXY_HOPS / CLIENT_IP_HEADER).
  const headers = new Headers(req.headers);
  for (const h of STRIP_REQUEST) headers.delete(h);

  const init: RequestInit = {
    method: req.method,
    headers,
    // Cancel the generation upstream if the browser goes away.
    signal: req.signal,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  try {
    const upstream = await fetch(url, init);
    const out = new Headers(upstream.headers);
    for (const h of STRIP_RESPONSE) out.delete(h);

    // Pass the body through as a stream so SSE plan snapshots arrive live.
    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: out,
    });
  } catch (err) {
    if (req.signal.aborted) return new NextResponse(null, { status: 499 });
    console.error("API proxy error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { detail: "SPICE's kitchen is offline right now. Try again in a moment." },
      { status: 502 },
    );
  }
}

export const dynamic = "force-dynamic";

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
