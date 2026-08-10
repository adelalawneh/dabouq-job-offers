import { NextResponse } from "next/server";
import { createSessionToken, portalUrl, SESSION_COOKIE } from "@/lib/session-token";

/**
 * Portal SSO identity. Both shapes are accepted so this app keeps working
 * across the portal's cutover: the nested one is current, the flat one is the
 * retired response. The client secret is likewise optional here — the portal
 * is what enforces it, so an app deployed before the portal upgrade keeps
 * working and starts authenticating the moment the secret is configured.
 */
type PortalIdentity = {
  user?: { id?: string; email?: string };
  organization?: { id?: string };
  application?: { slug?: string };
  // Retired flat shape.
  user_id?: string;
  organization_id?: string;
  app_slug?: string;
  email?: string;
  error?: string;
};

function appSlug() {
  return (process.env.DABOUQ_APP_SLUG || "job-offers").trim();
}

/** Server-side only — never expose this to the browser bundle. */
function clientSecret() {
  return (process.env.DABOUQ_CLIENT_SECRET || "").trim();
}

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

  const secret = clientSecret();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (secret) {
    // The portal authenticates this app before it spends the launch code.
    headers.Authorization = `Basic ${Buffer.from(
      `${appSlug()}:${secret}`,
      "utf8",
    ).toString("base64")}`;
  }

  try {
    const exchange = await fetch(`${portal}/api/v1/sso/exchange`, {
      method: "POST",
      headers,
      body: JSON.stringify({ code }),
      cache: "no-store",
    });
    const data = (await exchange.json().catch(() => ({}))) as PortalIdentity;

    const userId = data.user?.id ?? data.user_id;

    if (!exchange.ok || !userId) {
      return new NextResponse(
        blockedHtml(data.error || "فشل تبادل رمز الدخول مع البورتال.", portal),
        { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }

    const token = await createSessionToken({
      userId,
      organizationId: data.organization?.id ?? data.organization_id,
      appSlug: data.application?.slug ?? data.app_slug,
      email: data.user?.email ?? data.email,
    });

    const response = NextResponse.redirect(new URL("/", request.url));
    // The launch code is in this request's URL — keep it out of any Referer.
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("Cache-Control", "no-store");
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

/** `message` can carry a portal-supplied error code — never interpolate it raw. */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function blockedHtml(message: string, portal: string | null) {
  const safePortal =
    portal && /^https?:\/\//i.test(portal) ? escapeHtml(portal) : null;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="referrer" content="no-referrer"/>
<title>تسجيل الدخول</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Tahoma,sans-serif;background:#f4f6f8;color:#1a2332}
.box{max-width:420px;padding:32px;text-align:center}
a{display:inline-block;margin-top:16px;background:#0d7377;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none}
</style></head>
<body><div class="box"><h1>تعذّر الدخول</h1><p>${escapeHtml(message)}</p>
${safePortal ? `<a href="${safePortal}">العودة للبورتال</a>` : ""}
</div></body></html>`;
}
