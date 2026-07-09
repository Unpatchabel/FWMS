import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/session";

/**
 * Server-only session helpers that read the cookie jar via `next/headers`.
 * Kept separate from session.ts so the Edge middleware never imports
 * `next/headers` (which is server-only and would fail to build on the Edge).
 */

/** Read & verify the current session from the request cookies. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
