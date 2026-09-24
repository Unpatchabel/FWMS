import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import type { z } from "zod";
import type { setupSchema } from "@/lib/validators";

export type SetupInput = z.infer<typeof setupSchema>;

export async function isInstallationConfigured(): Promise<boolean> {
  return await prisma.household.count() !== 0;
}

/** The fixed ID makes simultaneous first-run requests compete for one row. */
export async function createOwnerInstallation(input: SetupInput) {
  if (await isInstallationConfigured()) throw new Error("This installation is already configured.");
  const passwordHash = await hashPassword(input.password);
  return prisma.$transaction(async (tx) => {
    if (await tx.household.count() !== 0) throw new Error("Already configured");
    const household = await tx.household.create({ data: {
      id: "fwms-primary", name: "My finances", currency: input.currency,
    } });
    const owner = await tx.user.create({ data: {
      householdId: household.id, email: input.email.toLowerCase(),
      name: "Owner", passwordHash, role: "OWNER",
    } });
    await tx.category.createMany({ data: [
      ...["Salary", "Business", "Rental", "Investment", "Other"].map(name => ({ householdId: household.id, name, type: "INCOME", color: "#12876A", isSystem: true })),
      ...["Food", "Bills", "Transport", "Education", "Healthcare", "Shopping", "Other"].map(name => ({ householdId: household.id, name, type: "EXPENSE", color: "#B4462F", isSystem: true })),
    ] });
    return owner;
  });
}
