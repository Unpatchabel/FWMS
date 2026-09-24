import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { ChangePasswordInput, ChangeUsernameInput, LoginInput } from "@/lib/validators";

export class AccountValidationError extends Error {}

export async function getOwnerUsername(): Promise<string> {
  const owner = await prisma.user.findFirst({ where: { role: "OWNER", isActive: true }, select: { name: true } });
  return owner?.name ?? "Owner";
}

/** This installation has one active owner; legacy owners previously used the name "Owner". */
export async function authenticateOwner(input: LoginInput) {
  const owners = await prisma.user.findMany({ where: { role: "OWNER", isActive: true } });
  const owner = owners.find(user => user.name.toLowerCase() === input.username.toLowerCase());
  return owner && await verifyPassword(input.password, owner.passwordHash) ? owner : null;
}

export async function changeOwnUsername(householdId: string, userId: string, input: ChangeUsernameInput) {
  const user = await prisma.user.findFirst({
    where: { id: userId, householdId, isActive: true, role: "OWNER" },
    select: { name: true, passwordHash: true, sessionVersion: true },
  });
  if (!user || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new AccountValidationError("Current password is incorrect.");
  }
  if (user.name === input.username) throw new AccountValidationError("Choose a different username.");
  return prisma.$transaction(async (tx) => {
    const result = await tx.user.updateMany({
      where: { id: userId, householdId, isActive: true, role: "OWNER", sessionVersion: user.sessionVersion },
      data: { name: input.username, sessionVersion: { increment: 1 } },
    });
    if (result.count !== 1) throw new AccountValidationError("Your account changed. Sign in and try again.");
    await logAudit({ householdId, userId, action: "UPDATE", entity: "User", entityId: userId,
      summary: "Changed own username" }, tx);
    return { name: input.username, sessionVersion: user.sessionVersion + 1 };
  });
}

export async function changeOwnPassword(householdId: string, userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findFirst({
    where: { id: userId, householdId, isActive: true, role: "OWNER" },
    select: { passwordHash: true },
  });
  if (!user || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new AccountValidationError("Current password is incorrect.");
  }
  const passwordHash = await hashPassword(input.newPassword);
  return prisma.$transaction(async (tx) => {
    const result = await tx.user.updateMany({
      where: { id: userId, householdId, isActive: true, role: "OWNER", passwordHash: user.passwordHash },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    if (result.count !== 1) throw new AccountValidationError("Your password changed. Sign in and try again.");
    await logAudit({ householdId, userId, action: "UPDATE", entity: "User", entityId: userId,
      summary: "Changed own password" }, tx);
  });
}
