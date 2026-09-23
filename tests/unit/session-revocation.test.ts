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

  it("rejects a legacy member or viewer even with a valid signed session", async () => {
    mocks.getSession.mockResolvedValue({ userId: "a", sessionVersion: 1 });
    mocks.findFirst.mockResolvedValue({
      id: "a", name: "Parent", email: "parent@example.test", role: "VIEWER",
      householdId: "family", sessionVersion: 1,
    });
    expect(await getCurrentUser()).toBeNull();
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ role: "OWNER" }),
    }));
  });
});
