import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { setupSchema } from "@/lib/validators";
import { createOwnerInstallation } from "@/services/setup.service";
import { createTestHousehold } from "../setup/helpers";

describe("owner installation setup", () => {
  it("validates the ledger currency and password before registration", () => {
    expect(setupSchema.safeParse({ username: "Alex", password: "valid-password-123", currency: "CAD" }).success).toBe(true);
    const trimmed = setupSchema.safeParse({ username: " Alex ", password: "valid-password-123", currency: "CAD" });
    expect(trimmed.success && trimmed.data.username).toBe("Alex");
    expect(setupSchema.safeParse({ username: "Alex", password: "valid-password-123", currency: "KWD" }).success).toBe(false);
    expect(setupSchema.safeParse({ username: "Alex", password: "short", currency: "AED" }).success).toBe(false);
    expect(setupSchema.safeParse({ username: " ", password: "valid-password-123", currency: "AED" }).success).toBe(false);
  });

  it("refuses a second owner and leaves existing installations intact", async () => {
    const { household } = await createTestHousehold();
    const before = await prisma.user.count();
    await expect(createOwnerInstallation({ username: "New owner", password: "valid-password-123", currency: "USD" }))
      .rejects.toThrow("already configured");
    expect(await prisma.user.count()).toBe(before);
    expect((await prisma.household.findUniqueOrThrow({ where: { id: household.id } })).currency).toBe("AED");
  });
});
