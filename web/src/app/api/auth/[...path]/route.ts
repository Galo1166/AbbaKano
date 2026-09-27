import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, context: RouteContext) {
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
  const response = await fetch(target, { method: request.method, headers, body, redirect: "manual" });
  const responseHeaders = new Headers();
  const contentType = response.headers.get("content-type");
  const setCookie = response.headers.get("set-cookie");

  if (contentType) responseHeaders.set("content-type", contentType);
  if (setCookie) responseHeaders.set("set-cookie", setCookie);

  if (response.status === 204) return new NextResponse(null, { status: 204, headers: responseHeaders });
  return new NextResponse(await response.text(), { status: response.status, headers: responseHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
