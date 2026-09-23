import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { ChangePasswordInput } from "@/lib/validators";

export class AccountValidationError extends Error {}

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
