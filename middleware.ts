import { NextResponse, type NextRequest } from "next/server";
import { isPortalOnly, SESSION_COOKIE, verifySessionToken } from "./lib/session-token";
import { portalOnlyBlockedHtml } from "./lib/portal-blocked-page";

const PUBLIC_PREFIXES = ["/auth/portal", "/r/", "/api/candidate"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|ttf|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));

  if (isPublic) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (session) {
    return NextResponse.next();
  }

  if (!isPortalOnly()) {
    return NextResponse.next();
  }

  const portal = (process.env.PORTAL_URL || process.env.NEXT_PUBLIC_PORTAL_URL || "").replace(
    /\/$/,
    "",
  );
  const html = portalOnlyBlockedHtml({
    portalUrl: portal || "https://www.dabouqtools.com",
  });

  return new NextResponse(html, {
    status: 401,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
