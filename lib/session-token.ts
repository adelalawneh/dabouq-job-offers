export type HrSession = {
  userId: string;
  email?: string;
  organizationId?: string;
  appSlug?: string;
};

export const SESSION_COOKIE = "job_offers_session";

function secretBytes() {
  const secret = process.env.SESSION_SECRET || process.env.PORTAL_URL || "dev-insecure-secret";
  return new TextEncoder().encode(secret);
}

function b64urlToBytes(s: string) {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]!);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacKey() {
  return crypto.subtle.importKey("raw", secretBytes(), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

/** Edge-safe HS256 JWT (no jose). */
export async function createSessionToken(payload: HrSession, maxAgeSec = 60 * 60 * 12) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + maxAgeSec,
  };
  const enc = new TextEncoder();
  const h = bytesToB64url(enc.encode(JSON.stringify(header)));
  const p = bytesToB64url(enc.encode(JSON.stringify(body)));
  const data = `${h}.${p}`;
  const key = await hmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return `${data}.${bytesToB64url(sig)}`;
}

export async function verifySessionToken(token: string): Promise<HrSession | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [h, p, s] = parts as [string, string, string];
    const data = `${h}.${p}`;
    const key = await hmacKey();
    const ok = await crypto.subtle.verify("HMAC", key, b64urlToBytes(s), new TextEncoder().encode(data));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(p))) as HrSession & {
      exp?: number;
    };
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.userId || typeof payload.userId !== "string") return null;
    return {
      userId: payload.userId,
      email: typeof payload.email === "string" ? payload.email : undefined,
      organizationId: typeof payload.organizationId === "string" ? payload.organizationId : undefined,
      appSlug: typeof payload.appSlug === "string" ? payload.appSlug : undefined,
    };
  } catch {
    return null;
  }
}

export function isPortalOnly() {
  const raw = (process.env.PORTAL_ONLY || "true").trim().toLowerCase();
  return raw !== "false" && raw !== "0" && raw !== "no";
}

export function portalUrl() {
  return (process.env.PORTAL_URL || process.env.NEXT_PUBLIC_PORTAL_URL || "").trim().replace(/\/$/, "");
}

export function appBaseUrl() {
  return (process.env.APP_BASE_URL || "http://localhost:3002").trim().replace(/\/$/, "");
}
