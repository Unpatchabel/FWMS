import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/lib/constants";

/**
 * Session tokens (Edge-safe).
 *
 * This module contains ONLY the JWT sign/verify logic and cookie options — no
 * `next/headers` import — so it can be safely pulled into the Edge middleware
 * as well as Node route handlers. Cookie *reading* from a server context lives
 * in session-cookie.ts, which is server-only.
 *
 * A session is a JWT signed with AUTH_SECRET (HS256), stored in an HTTP-only,
 * SameSite=Lax, Secure in HTTPS production. Desktop's loopback HTTP uses a
 * non-Secure cookie, still HttpOnly and confined to this browser profile.
 */

export const SESSION_COOKIE = "fwms_session";

export interface SessionPayload {
  userId: string;
  householdId: string;
  role: UserRole;
  name: string;
  sessionVersion: number;
  [key: string]: unknown; // satisfies jose's JWTPayload index signature
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Set a long random value in .env"
    );
  }
  return new TextEncoder().encode(secret);
}

export function sessionMaxAgeSeconds(): number {
  return Number(process.env.SESSION_MAX_AGE ?? 60 * 60 * 24 * 7);
}

/** Cookie attributes used for both setting and clearing the session cookie. */
export function sessionCookieOptions(maxAge: number = sessionMaxAgeSeconds()) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production" && process.env.FWMS_DESKTOP !== "1",
    path: "/",
    maxAge,
  };
}

/** Create a signed session token. */
export async function createSessionToken(
  payload: SessionPayload
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${sessionMaxAgeSeconds()}s`)
    .sign(getSecret());
}

/** Verify a token and return its payload, or null if invalid/expired. */
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
