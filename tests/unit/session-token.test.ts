import { afterEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { createSessionToken, verifySessionToken, sessionMaxAgeSeconds, sessionCookieOptions } from "@/lib/session";

const payload = { userId: "owner", householdId: "home", role: "OWNER" as const, name: "Owner", sessionVersion: 0 };
afterEach(() => vi.unstubAllEnvs());
describe("session token boundaries", () => {
  it("verifies a signed, typed, expiring owner token", async () => {
    expect(await verifySessionToken(await createSessionToken(payload))).toMatchObject(payload);
  });
  it("rejects tampering, expiry and missing claims", async () => {
    const token = await createSessionToken(payload);
    expect(await verifySessionToken(token + "corrupt")).toBeNull();
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const expired = await new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(1).sign(secret);
    expect(await verifySessionToken(expired)).toBeNull();
    const incomplete = await new SignJWT({ userId: "owner" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);
    expect(await verifySessionToken(incomplete)).toBeNull();
    const wrongAlg = await new SignJWT(payload).setProtectedHeader({ alg: "HS384" }).setIssuedAt().setExpirationTime("1h").sign(secret);
    expect(await verifySessionToken(wrongAlg)).toBeNull();
  });
  it("rejects placeholder secrets and invalid lifetimes", async () => {
    vi.stubEnv("AUTH_SECRET", "replace-me-with-a-long-random-string");
    await expect(createSessionToken(payload)).rejects.toThrow("AUTH_SECRET");
    for (const value of ["NaN", "-1", "0", "2.5", "2592001"]) {
      vi.stubEnv("SESSION_MAX_AGE", value);
      expect(() => sessionMaxAgeSeconds()).toThrow("SESSION_MAX_AGE");
    }
  });
  it("keeps production HTTPS cookies secure, with an explicit desktop exception", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("FWMS_DESKTOP", "");
    expect(sessionCookieOptions()).toMatchObject({ secure: true, httpOnly: true, sameSite: "lax" });
    vi.stubEnv("FWMS_DESKTOP", "1");
    expect(sessionCookieOptions().secure).toBe(false);
  });
});
