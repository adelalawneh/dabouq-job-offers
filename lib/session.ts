import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  createSessionToken,
  verifySessionToken,
  type HrSession,
  isPortalOnly,
  portalUrl,
  appBaseUrl,
} from "./session-token";

export type { HrSession };
export {
  SESSION_COOKIE,
  createSessionToken,
  verifySessionToken,
  isPortalOnly,
  portalUrl,
  appBaseUrl,
};

export async function getSession(): Promise<HrSession | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return verifySessionToken(raw);
}
