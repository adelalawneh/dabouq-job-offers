import { NextResponse } from "next/server";
import { createSessionToken, portalUrl, SESSION_COOKIE } from "@/lib/session-token";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim();
  const portal = portalUrl();

  if (!code) {
    return new NextResponse(blockedHtml("رمز الدخول مفقود. افتح التطبيق من البورتال.", portal), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (!portal) {
    return new NextResponse(
      blockedHtml("PORTAL_URL غير مضبوط على الخادم.", null),
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  try {
    const exchange = await fetch(`${portal}/api/v1/sso/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = (await exchange.json().catch(() => ({}))) as {
      error?: string;
      user_id?: string;
      organization_id?: string;
      app_slug?: string;
      email?: string;
    };

    if (!exchange.ok || !data.user_id) {
      return new NextResponse(
        blockedHtml(data.error || "فشل تبادل رمز الدخول مع البورتال.", portal),
        { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }

    const token = await createSessionToken({
      userId: data.user_id,
      organizationId: data.organization_id,
      appSlug: data.app_slug,
      email: data.email,
    });

    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return response;
  } catch {
    return new NextResponse(blockedHtml("تعذّر الوصول إلى البورتال.", portal), {
      status: 502,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

function blockedHtml(message: string, portal: string | null) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>تسجيل الدخول</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Tahoma,sans-serif;background:#f4f6f8;color:#1a2332}
.box{max-width:420px;padding:32px;text-align:center}
a{display:inline-block;margin-top:16px;background:#0d7377;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none}
</style></head>
<body><div class="box"><h1>تعذّر الدخول</h1><p>${message}</p>
${portal ? `<a href="${portal}">العودة للبورتال</a>` : ""}
</div></body></html>`;
}
