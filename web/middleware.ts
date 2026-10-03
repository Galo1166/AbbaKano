import { NextRequest, NextResponse } from "next/server";

const publicPaths = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/forgotpassword",
  "/admin/login",
  "/admin/register",
]);

const protectedPaths = [
  "/app",
  "/airtime",
  "/data",
  "/electricity",
  "/cable-tv",
  "/fund-wallet",
  "/history",
  "/profile",
  "/refer-and-earn",
  "/admin",
];

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/forgotpassword",
    "/admin/login",
    "/admin/register",
    "/app/:path*",
    "/airtime",
    "/airtime/:path*",
    "/data",
    "/data/:path*",
    "/electricity",
    "/electricity/:path*",
    "/cable-tv",
    "/cable-tv/:path*",
    "/fund-wallet",
    "/fund-wallet/:path*",
    "/history",
    "/history/:path*",
    "/profile",
    "/profile/:path*",
    "/refer-and-earn",
    "/refer-and-earn/:path*",
    "/admin",
    "/admin/:path*",
  ],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.has(pathname)) {
    return NextResponse.next();
  }

  const isProtected = protectedPaths.some((route) => {
    if (pathname === route) return true;
    return pathname.startsWith(`${route}/`);
  });

  if (!isProtected) {
    return NextResponse.next();
  }

  return NextResponse.next();
}
