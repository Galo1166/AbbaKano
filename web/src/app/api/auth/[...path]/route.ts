import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL || (process.env.NODE_ENV === "production" ? "https://abbakano.onrender.com" : "http://localhost:3000");

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, context: RouteContext) {
  if (!backendUrl) {
    return NextResponse.json({ message: "Backend is not configured. Set BACKEND_URL on the web service." }, { status: 503 });
  }

  const { path } = await context.params;
  const target = `${backendUrl.replace(/\/$/, "")}/${path.join("/")}${request.nextUrl.search}`;
  const headers = new Headers();
  const forwardedHeaders = ["content-type", "cookie", "x-csrf-token", "x-client-platform", "idempotency-key"];

  for (const name of forwardedHeaders) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  headers.set("x-client-platform", "web");

  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
  let response: Response;
  try {
    response = await fetch(target, { method: request.method, headers, body, redirect: "manual" });
  } catch {
    return NextResponse.json({ message: "Could not reach the backend. Check BACKEND_URL on the web service." }, { status: 502 });
  }
  const responseHeaders = new Headers();
  const contentType = response.headers.get("content-type");
  const setCookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter((cookie): cookie is string => Boolean(cookie));

  if (contentType) responseHeaders.set("content-type", contentType);
  for (const cookie of setCookies) responseHeaders.append("set-cookie", cookie);

  if (response.status === 204) return new NextResponse(null, { status: 204, headers: responseHeaders });
  return new NextResponse(await response.text(), { status: response.status, headers: responseHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
