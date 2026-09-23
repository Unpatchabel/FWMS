import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), findFirst: vi.fn() }));
vi.mock("@/lib/session-cookie", () => ({ getSession: mocks.getSession }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findFirst: mocks.findFirst } } }));

import { getCurrentUser } from "@/lib/auth";

describe("revoked sessions", () => {
  it("rejects a signed token after the user's password or access changes", async () => {
    mocks.getSession.mockResolvedValue({ userId: "a", sessionVersion: 0 });
    mocks.findFirst.mockResolvedValue({
      id: "a", name: "Parent", email: "parent@example.test", role: "OWNER",
      householdId: "family", sessionVersion: 1,
    });
    expect(await getCurrentUser()).toBeNull();
  });

  it("uses the current database role for a valid session", async () => {
    mocks.getSession.mockResolvedValue({ userId: "a", sessionVersion: 1 });
    mocks.findFirst.mockResolvedValue({
      id: "a", name: "Parent", email: "parent@example.test", role: "VIEWER",
      householdId: "family", sessionVersion: 1,
    });
    expect(await getCurrentUser()).toMatchObject({ role: "VIEWER", householdId: "family" });
  });
});
