import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/password";
import type {
  ChangePasswordInput, FamilyAccessInput, FamilyMemberCreateInput, FamilyRoleInput,
} from "@/lib/validators";

export class FamilyValidationError extends Error {}

export async function listFamilyMembers(householdId: string) {
  return prisma.user.findMany({
    where: { householdId },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

/** Owner password is verified for each access change, then checked again in the write transaction. */
async function verifyOwner(householdId: string, actorId: string, password: string) {
  const actor = await prisma.user.findFirst({
    where: { id: actorId, householdId, isActive: true, role: "OWNER" },
    select: { passwordHash: true },
  });
  if (!actor || !(await verifyPassword(password, actor.passwordHash))) {
    throw new FamilyValidationError("Owner password is incorrect.");
  }
  return actor.passwordHash;
}

async function assertOwner(tx: Prisma.TransactionClient, householdId: string, actorId: string, hash: string) {
  const actor = await tx.user.findFirst({
    where: { id: actorId, householdId, role: "OWNER", isActive: true, passwordHash: hash },
    select: { id: true },
  });
  if (!actor) throw new FamilyValidationError("Owner access changed. Refresh and try again.");
}

export async function createFamilyMember(householdId: string, actorId: string, input: FamilyMemberCreateInput) {
  const actorHash = await verifyOwner(householdId, actorId, input.ownerPassword);
  const passwordHash = await hashPassword(input.password);
  try {
    return await prisma.$transaction(async (tx) => {
      await assertOwner(tx, householdId, actorId, actorHash);
      const member = await tx.user.create({
        data: { householdId, name: input.name, email: input.email, passwordHash, role: input.role },
        select: { id: true },
      });
      await logAudit({ householdId, userId: actorId, action: "CREATE", entity: "User", entityId: member.id,
        summary: `Added family member as ${input.role}` }, tx);
      return member;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new FamilyValidationError("That email cannot be used for a new member.");
    }
    throw error;
  }
}

export async function changeFamilyRole(householdId: string, actorId: string, input: FamilyRoleInput) {
  const actorHash = await verifyOwner(householdId, actorId, input.ownerPassword);
  return prisma.$transaction(async (tx) => {
    await assertOwner(tx, householdId, actorId, actorHash);
    const target = await tx.user.findFirst({ where: { id: input.memberId, householdId, isActive: true },
      select: { role: true } });
    if (!target || target.role === "OWNER") throw new FamilyValidationError("This member cannot be changed.");
    if (target.role === input.role) return;
    await tx.user.update({ where: { id: input.memberId },
      data: { role: input.role, sessionVersion: { increment: 1 } } });
    await logAudit({ householdId, userId: actorId, action: "UPDATE", entity: "User", entityId: input.memberId,
      summary: `Changed member role to ${input.role}` }, tx);
  });
}

export async function changeFamilyAccess(householdId: string, actorId: string, input: FamilyAccessInput) {
  const actorHash = await verifyOwner(householdId, actorId, input.ownerPassword);
  return prisma.$transaction(async (tx) => {
    await assertOwner(tx, householdId, actorId, actorHash);
    const target = await tx.user.findFirst({ where: { id: input.memberId, householdId },
      select: { role: true, isActive: true } });
    if (!target || input.memberId === actorId) throw new FamilyValidationError("This member cannot be changed.");
    if (target.isActive === input.isActive) return;
    await tx.user.update({ where: { id: input.memberId },
      data: { isActive: input.isActive, sessionVersion: { increment: 1 } } });
    await logAudit({ householdId, userId: actorId, action: "UPDATE", entity: "User", entityId: input.memberId,
      summary: input.isActive ? "Restored family member access" : "Disabled family member access" }, tx);
  });
}

export async function changeOwnPassword(householdId: string, userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findFirst({ where: { id: userId, householdId, isActive: true },
    select: { passwordHash: true } });
  if (!user || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new FamilyValidationError("Current password is incorrect.");
  }
  const passwordHash = await hashPassword(input.newPassword);
  return prisma.$transaction(async (tx) => {
    const result = await tx.user.updateMany({
      where: { id: userId, householdId, isActive: true, passwordHash: user.passwordHash },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    if (result.count !== 1) throw new FamilyValidationError("Your password changed. Sign in and try again.");
    await logAudit({ householdId, userId, action: "UPDATE", entity: "User", entityId: userId,
      summary: "Changed own password" }, tx);
  });
}
