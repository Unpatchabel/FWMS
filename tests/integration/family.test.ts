import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  createFamilyMember, changeFamilyRole, changeFamilyAccess, changeOwnPassword,
  listFamilyMembers, FamilyValidationError,
} from "@/services/family.service";
import { createTestHousehold } from "../setup/helpers";

async function setupOwner() {
  const { household, user } = await createTestHousehold();
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword("owner-password-123") } });
  return { household, user };
}

const input = (role: "OWNER" | "MEMBER" | "VIEWER", email: string) => ({
  name: "Family member", email, role, password: "initial-password-123",
  ownerPassword: "owner-password-123",
});

describe("family access", () => {
  it("lets an owner add two co-owners, kids and an advisor to one household", async () => {
    const { household, user } = await setupOwner();
    const mom = await createFamilyMember(household.id, user.id, input("OWNER", `${household.id}-mom@example.test`));
    await createFamilyMember(household.id, user.id, input("OWNER", `${household.id}-dad@example.test`));
    await createFamilyMember(household.id, user.id, input("MEMBER", `${household.id}-kid@example.test`));
    await createFamilyMember(household.id, user.id, input("VIEWER", `${household.id}-advisor@example.test`));
    // A co-owner can independently manage access with their own password.
    await createFamilyMember(household.id, mom.id, {
      ...input("MEMBER", `${household.id}-second-kid@example.test`),
      ownerPassword: "initial-password-123",
    });

    const members = await listFamilyMembers(household.id);
    expect(members).toHaveLength(6);
    expect(members.map((member) => member.role).sort()).toEqual(
      ["OWNER", "OWNER", "OWNER", "MEMBER", "MEMBER", "VIEWER"].sort()
    );
    expect(members.every((member) => member.isActive)).toBe(true);
    const login = await prisma.user.findUnique({ where: { email: `${household.id}-advisor@example.test` } });
    expect(await verifyPassword("initial-password-123", login!.passwordHash)).toBe(true);
    // Listing members never returns password hashes.
    expect("passwordHash" in members[0]).toBe(false);
  });

  it("enforces owner password and household boundaries for role and access changes", async () => {
    const { household, user } = await setupOwner();
    const member = await createFamilyMember(household.id, user.id, input("MEMBER", `${household.id}-kid@example.test`));
    const other = await setupOwner();
    const outsider = await createFamilyMember(other.household.id, other.user.id,
      input("MEMBER", `${other.household.id}-kid@example.test`));

    await expect(createFamilyMember(household.id, member.id,
      input("VIEWER", `${household.id}-unauthorized@example.test`)))
      .rejects.toThrow(FamilyValidationError);
    await expect(createFamilyMember(household.id, user.id, {
      ...input("VIEWER", `${household.id}-wrong@example.test`), ownerPassword: "incorrect",
    })).rejects.toThrow(FamilyValidationError);
    await expect(changeFamilyRole(household.id, user.id, {
      memberId: outsider.id, role: "VIEWER", ownerPassword: "owner-password-123",
    })).rejects.toThrow(FamilyValidationError);
    await expect(changeFamilyAccess(household.id, user.id, {
      memberId: user.id, isActive: false, ownerPassword: "owner-password-123",
    })).rejects.toThrow(FamilyValidationError);

    await changeFamilyRole(household.id, user.id, {
      memberId: member.id, role: "VIEWER", ownerPassword: "owner-password-123",
    });
    let updated = await prisma.user.findUniqueOrThrow({ where: { id: member.id } });
    expect(updated.role).toBe("VIEWER");
    expect(updated.sessionVersion).toBe(1);

    await changeFamilyAccess(household.id, user.id, {
      memberId: member.id, isActive: false, ownerPassword: "owner-password-123",
    });
    updated = await prisma.user.findUniqueOrThrow({ where: { id: member.id } });
    expect(updated.isActive).toBe(false);
    expect(updated.sessionVersion).toBe(2);

    await changeFamilyAccess(household.id, user.id, {
      memberId: member.id, isActive: true, ownerPassword: "owner-password-123",
    });
    updated = await prisma.user.findUniqueOrThrow({ where: { id: member.id } });
    expect(updated.isActive).toBe(true);
    expect(updated.sessionVersion).toBe(3);
  });

  it("requires the current password and revokes old sessions when it changes", async () => {
    const { household, user } = await setupOwner();
    await expect(changeOwnPassword(household.id, user.id, {
      currentPassword: "wrong", newPassword: "new-long-password-123",
    })).rejects.toThrow(FamilyValidationError);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).sessionVersion).toBe(0);

    await changeOwnPassword(household.id, user.id, {
      currentPassword: "owner-password-123", newPassword: "new-long-password-123",
    });
    const changed = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(changed.sessionVersion).toBe(1);
    expect(await verifyPassword("new-long-password-123", changed.passwordHash)).toBe(true);
    expect(await verifyPassword("owner-password-123", changed.passwordHash)).toBe(false);
  });
});
