/** Read-only reconciliation. Prints counts, never private records. Does not repair data. */
import { PrismaClient, Prisma } from "@prisma/client";
const db = new PrismaClient();
const checks = [
  ["Transaction amount outside Prisma Int or wrong sign/status/type", Prisma.sql`SELECT COUNT(*) AS n FROM "Transaction" WHERE typeof(amount)!='integer' OR abs(amount)>2147483647 OR (type='INCOME' AND amount<=0) OR (type='EXPENSE' AND amount>=0) OR type NOT IN ('INCOME','EXPENSE','TRANSFER','ADJUSTMENT') OR status NOT IN ('ACTIVE','VOID')`],
  ["Transaction household/account/category/author mismatch", Prisma.sql`SELECT COUNT(*) AS n FROM "Transaction" t WHERE NOT EXISTS (SELECT 1 FROM Account a WHERE a.id=t.accountId AND a.householdId=t.householdId) OR (t.categoryId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Category c WHERE c.id=t.categoryId AND c.householdId=t.householdId AND c.type=t.type)) OR (t.createdById IS NOT NULL AND NOT EXISTS (SELECT 1 FROM User u WHERE u.id=t.createdById AND u.householdId=t.householdId))`],
  ["Unbalanced or malformed transfer groups", Prisma.sql`SELECT COUNT(*) AS n FROM (SELECT transferGroupId FROM "Transaction" WHERE type='TRANSFER' GROUP BY householdId,transferGroupId HAVING transferGroupId IS NULL OR COUNT(*)!=2 OR SUM(amount)!=0 OR COUNT(DISTINCT accountId)!=2 OR COUNT(DISTINCT status)!=1 OR SUM(CASE WHEN transferAccountId IS NULL OR transferAccountId=accountId THEN 1 ELSE 0 END)>0)`],
  ["Invalid loan payment split or range", Prisma.sql`SELECT COUNT(*) AS n FROM LoanPayment WHERE typeof(amount)!='integer' OR typeof(principal)!='integer' OR typeof(interest)!='integer' OR amount<=0 OR amount>2147483647 OR principal<0 OR interest<0 OR amount!=principal+interest`],
  ["Overpaid or out-of-range loan", Prisma.sql`SELECT COUNT(*) AS n FROM Loan l WHERE originalAmount<=0 OR originalAmount>2147483647 OR openingBalance<0 OR openingBalance>2147483647 OR COALESCE((SELECT SUM(principal) FROM LoanPayment p WHERE p.loanId=l.id),0)>openingBalance`],
  ["Invalid linked loan transaction", Prisma.sql`SELECT COUNT(*) AS n FROM LoanPayment p JOIN Loan l ON l.id=p.loanId LEFT JOIN "Transaction" t ON t.id=p.transactionId WHERE p.transactionId IS NOT NULL AND (t.id IS NULL OR t.type!='EXPENSE' OR t.status!='ACTIVE' OR t.householdId!=l.householdId OR t.amount!=-p.amount)`],
  ["Legacy payments without a cash transaction (manual reconciliation required)", Prisma.sql`SELECT COUNT(*) AS n FROM LoanPayment WHERE transactionId IS NULL`],
  ["Out-of-range asset or valuation", Prisma.sql`SELECT (SELECT COUNT(*) FROM Asset WHERE purchaseValue<=0 OR purchaseValue>2147483647) + (SELECT COUNT(*) FROM AssetValuation WHERE value<=0 OR value>2147483647) AS n`],
] as const;
async function main() {
  let failed = false;
  await db.$transaction(async tx => {
    for (const [label, query] of checks) {
      const [row] = await tx.$queryRaw<{ n: bigint }[]>(query);
      const count = Number(row.n);
      console.log(`${count === 0 ? "PASS" : "FAIL"}: ${label}: ${count}`);
      failed ||= count !== 0;
    }
  });
  if (failed) process.exitCode = 1;
}
main().catch(() => { console.error("Could not check the ledger. Verify DATABASE_URL and apply migrations."); process.exitCode = 1; }).finally(() => db.$disconnect());
