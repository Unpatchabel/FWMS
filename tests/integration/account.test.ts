import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { authenticateOwner, changeOwnUsername, changeOwnPassword, AccountValidationError } from "@/services/account.service";
import { createTestHousehold } from "../setup/helpers";

describe("owner account", () => {
  it("signs in with a username and safely changes it without losing account history", async () => {
    const { household, user } = await createTestHousehold();
    const password = "owner-password-123";
    await prisma.user.update({ where: { id: user.id }, data: {
      name: `Tony-${user.id}`, passwordHash: await hashPassword(password),
    } });
    expect((await authenticateOwner({ username: `tony-${user.id}`, password }))?.id).toBe(user.id);
    await expect(changeOwnUsername(household.id, user.id, {
      username: "New name", currentPassword: "wrong",
    })).rejects.toThrow(AccountValidationError);
    const changed = await changeOwnUsername(household.id, user.id, {
      username: `New-${user.id}`, currentPassword: password,
    });
    expect(changed.sessionVersion).toBe(1);
    expect((await authenticateOwner({ username: `tony-${user.id}`, password }))).toBeNull();
    expect((await authenticateOwner({ username: `NEW-${user.id}`, password }))?.id).toBe(user.id);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).householdId).toBe(household.id);
  });

  it("requires the current password and revokes old sessions when it changes", async () => {
    const { household, user } = await createTestHousehold();
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword("owner-password-123") } });
    await expect(changeOwnPassword(household.id, user.id, {
      currentPassword: "wrong", newPassword: "new-long-password-123",
    })).rejects.toThrow(AccountValidationError);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).sessionVersion).toBe(0);

    await changeOwnPassword(household.id, user.id, {
      currentPassword: "owner-password-123", newPassword: "new-long-password-123",
    });
    const changed = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(changed.sessionVersion).toBe(1);
    expect(await verifyPassword("new-long-password-123", changed.passwordHash)).toBe(true);
    expect(await verifyPassword("owner-password-123", changed.passwordHash)).toBe(false);
  });

  it("does not let a legacy member change the owner password", async () => {
    const { household, user } = await createTestHousehold();
    await prisma.user.update({ where: { id: user.id }, data: { role: "MEMBER", passwordHash: await hashPassword("member-password-123") } });
    await expect(changeOwnPassword(household.id, user.id, {
      currentPassword: "member-password-123", newPassword: "new-long-password-123",
    })).rejects.toThrow(AccountValidationError);
  });
});
