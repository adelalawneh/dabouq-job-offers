import { NextResponse } from "next/server";
import { createSessionToken, portalUrl, SESSION_COOKIE } from "@/lib/session-token";
import { portalOnlyBlockedHtml } from "@/lib/portal-blocked-page";

function blockedPage(portal: string | null) {
  return portalOnlyBlockedHtml({
    portalUrl: portal || "https://www.dabouqtools.com",
  });
}

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
    return new NextResponse(blockedPage(portal), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (!portal) {
    return new NextResponse(blockedPage(null), {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
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
      return new NextResponse(blockedPage(portal), {
        status: 401,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
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
    return new NextResponse(blockedPage(portal), {
      status: 502,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}
