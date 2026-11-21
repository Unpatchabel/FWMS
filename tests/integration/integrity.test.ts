import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createAccount, listAccounts } from "@/services/accounts.service";
import { createTransaction, voidTransaction } from "@/services/transactions.service";
import { createLoan, recordLoanPayment, listLoans } from "@/services/loans.service";
import { exportHouseholdData } from "@/services/backup.service";
import { getMonthlyFlow, getTotalCashFils } from "@/services/summary.service";
import { createTestHousehold, createTestCategory } from "../setup/helpers";

async function scenario() {
  const { household, user } = await createTestHousehold();
  const account = await createAccount(household.id, user.id, { name: "Cash", type: "CASH", openingBalanceAed: "1000" });
  const category = await createTestCategory(household.id, "Pay", "INCOME");
  return { household, user, account, category };
}

describe("ledger integrity regressions", () => {
  it("stores the largest supported entry and aggregates beyond Int32 without corrupting totals", async () => {
    const { household, user, account, category } = await scenario();
    for (let i = 0; i < 2; i++) await createTransaction(household.id, user.id, {
      type: "INCOME", accountId: account.id, categoryId: category.id, amountAed: "21474836.47", date: "2026-01-10",
    });
    expect(await getTotalCashFils(household.id)).toBe(4295067294);
    expect((await listAccounts(household.id))[0].balanceFils).toBe(4295067294);
    expect((await getMonthlyFlow(household.id, new Date(2026, 0, 10))).incomeFils).toBe(4294967294);
    await expect(createTransaction(household.id, user.id, {
      type: "INCOME", accountId: account.id, categoryId: category.id, amountAed: "21474836.48", date: "2026-01-10",
    })).rejects.toThrow();
  });
  it("rejects cross-household accounts and categories at both service and database boundaries", async () => {
    const a = await scenario(), b = await scenario();
    for (const [accountId, categoryId] of [[b.account.id, a.category.id], [a.account.id, b.category.id]]) {
      await expect(createTransaction(a.household.id, a.user.id, {
        type: "INCOME", accountId, categoryId, amountAed: "10", date: "2026-01-10",
      })).rejects.toThrow();
      await expect(prisma.transaction.create({ data: { householdId: a.household.id, accountId, categoryId, type: "INCOME", amount: 1000, date: new Date() } })).rejects.toThrow();
    }
    expect(await getTotalCashFils(a.household.id)).toBe(100000);
  });
  it("prevents a wrong-sign row even when bypassing application validation", async () => {
    const { household, account, category } = await scenario();
    await expect(prisma.transaction.create({ data: { householdId: household.id, accountId: account.id, categoryId: category.id, type: "INCOME", amount: -1, date: new Date() } })).rejects.toThrow();
  });
  it("only records one VOID audit event when duplicate requests race", async () => {
    const { household, user, account, category } = await scenario();
    const entry = await createTransaction(household.id, user.id, { type: "INCOME", accountId: account.id, categoryId: category.id, amountAed: "10", date: "2026-01-10" });
    const attempts = await Promise.allSettled([voidTransaction(household.id, user.id, entry.id), voidTransaction(household.id, user.id, entry.id)]);
    expect(attempts.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.auditLog.count({ where: { entityId: entry.id, action: "VOID" } })).toBe(1);
    expect(await getTotalCashFils(household.id)).toBe(100000);
  });
  it("concurrent payments cannot repay more principal than the outstanding loan", async () => {
    const { household, user, account } = await scenario();
    const loan = await createLoan(household.id, user.id, { name: "Loan", originalAmountAed: "100", openingBalanceAed: "100" });
    const input = { loanId: loan.id, accountId: account.id, amountAed: "80", interestAed: "0", paymentDate: "2026-01-10" };
    const attempts = await Promise.allSettled([recordLoanPayment(household.id, user.id, input), recordLoanPayment(household.id, user.id, input)]);
    expect(attempts.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect((await listLoans(household.id))[0].remainingBalanceFils).toBe(2000);
    expect(await getTotalCashFils(household.id)).toBe(92000);
    const payment = await prisma.loanPayment.findFirstOrThrow({ where: { loanId: loan.id } });
    await expect(prisma.transaction.update({ where: { id: payment.transactionId! }, data: { status: "VOID" } })).rejects.toThrow();
    await expect(prisma.loanPayment.create({ data: { loanId: loan.id, amount: 3000, principal: 3000, interest: 0, paymentDate: new Date() } })).rejects.toThrow();
    await expect(prisma.loanPayment.create({ data: { loanId: loan.id, amount: 10, principal: 8, interest: 3, paymentDate: new Date() } })).rejects.toThrow();
  });
  it("exports one household without credentials, including VOID history", async () => {
    const { household, user, account, category } = await scenario();
    const other = await scenario();
    const entry = await createTransaction(household.id, user.id, { type: "INCOME", accountId: account.id, categoryId: category.id, amountAed: "10", date: "2026-01-10" });
    await voidTransaction(household.id, user.id, entry.id);
    const archive = await exportHouseholdData(household.id);
    expect(archive.transactions.find(row => row.id === entry.id)?.status).toBe("VOID");
    expect(JSON.stringify(archive)).not.toContain("passwordHash");
    expect(JSON.stringify(archive)).not.toContain(other.household.id);
    expect(JSON.stringify(archive)).not.toContain("sessionVersion");
  });
});
