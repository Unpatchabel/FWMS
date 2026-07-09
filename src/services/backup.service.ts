import { prisma } from "@/lib/prisma";

/**
 * Assembles a complete export of one household's data as plain, serializable
 * objects. Deliberately excludes `passwordHash` (and any other credential
 * material) — an export is for the family's own records, not a way to leak
 * bcrypt hashes if the file is ever shared or lost.
 *
 * Includes VOIDed transactions (labeled by their `status`), unlike every
 * other read in the app which filters them out — a backup is meant to be a
 * complete archival record, not a "current totals" view.
 */
export async function exportHouseholdData(householdId: string) {
  const [household, users, accounts, categories, transactions, assets, loans, goals, auditLogs] =
    await Promise.all([
      prisma.household.findUnique({ where: { id: householdId } }),
      prisma.user.findMany({
        where: { householdId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          // passwordHash intentionally omitted
        },
      }),
      prisma.account.findMany({ where: { householdId } }),
      prisma.category.findMany({ where: { householdId } }),
      prisma.transaction.findMany({
        where: { householdId },
        orderBy: { date: "asc" },
      }),
      prisma.asset.findMany({
        where: { householdId },
        include: { valuations: { orderBy: { valuationDate: "asc" } } },
      }),
      prisma.loan.findMany({
        where: { householdId },
        include: { payments: { orderBy: { paymentDate: "asc" } } },
      }),
      prisma.goal.findMany({ where: { householdId } }),
      prisma.auditLog.findMany({ where: { householdId }, orderBy: { createdAt: "asc" } }),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    currency: household?.currency ?? "AED",
    moneyUnit: "fils (1 AED = 100 fils)",
    household,
    users,
    accounts,
    categories,
    transactions,
    assets,
    loans,
    goals,
    auditLogs,
  };
}
