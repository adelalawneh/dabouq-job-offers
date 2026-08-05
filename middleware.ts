import { NextResponse, type NextRequest } from "next/server";
import { isPortalOnly, SESSION_COOKIE, verifySessionToken } from "./lib/session-token";

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

  const portal = (process.env.PORTAL_URL || process.env.NEXT_PUBLIC_PORTAL_URL || "").replace(/\/$/, "");
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>الوصول من البورتال فقط</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:"Segoe UI",Tahoma,sans-serif;
      background:radial-gradient(ellipse at top,#e8f2f2,#f4f6f8);color:#1a2332}
    .box{max-width:420px;padding:32px;text-align:center}
    h1{font-size:1.4rem;margin:0 0 12px}
    p{color:#5a6a7a;line-height:1.7;margin:0 0 20px}
    a{display:inline-block;background:#0d7377;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none}
  </style>
</head>
<body>
  <div class="box">
    <h1>الوصول من البورتال فقط</h1>
    <p>لا يمكن فتح مولّد العروض الوظيفية مباشرة. افتحه من أدوات دابوق بعد تسجيل الدخول.</p>
    ${portal ? `<a href="${portal}">الانتقال إلى البورتال</a>` : ""}
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 401,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
