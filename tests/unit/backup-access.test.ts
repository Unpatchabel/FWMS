import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), exportHouseholdData: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  isOwner: (user: { role: string }) => user.role === "OWNER",
}));
vi.mock("@/services/backup.service", () => ({ exportHouseholdData: mocks.exportHouseholdData }));

import { GET } from "@/app/api/backup/route";

describe("backup access", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.exportHouseholdData.mockReset();
  });

  it.each(["VIEWER", "MEMBER"])("refuses a %s before reading private archive data", async (role) => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user", role, householdId: "family" });
    const response = await GET();
    expect(response.status).toBe(403);
    expect(mocks.exportHouseholdData).not.toHaveBeenCalled();
  });

  it("allows an owner to export their own household", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "owner", role: "OWNER", householdId: "family" });
    mocks.exportHouseholdData.mockResolvedValue({ household: { id: "family" } });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mocks.exportHouseholdData).toHaveBeenCalledWith("family");
  });
});
