import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** SQLite SUM can exceed Prisma's per-row Int range. Decode decimal text safely. */
export function parseLedgerTotal(value: string): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) throw new Error("Ledger total exceeds the supported exact integer range.");
  return result;
}

export async function accountTotals(householdId: string, db: Prisma.TransactionClient = prisma): Promise<Map<string, number>> {
  const rows = await db.$queryRaw<{ accountId: string; total: string }[]>`
    SELECT accountId, CAST(SUM(amount) AS TEXT) AS total FROM "Transaction"
    WHERE householdId = ${householdId} AND status = 'ACTIVE' GROUP BY accountId`;
  return new Map(rows.map(row => [row.accountId, parseLedgerTotal(row.total)]));
}
