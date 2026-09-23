import { describe, expect, it } from "vitest";
import { getDashboardAnalytics } from "@/services/dashboard-analytics.service";
import { createAccount } from "@/services/accounts.service";
import { createLoan, recordLoanPayment } from "@/services/loans.service";
import { createTransaction, createTransfer, voidTransaction } from "@/services/transactions.service";
import { createTestAccount, createTestCategory, createTestHousehold } from "../setup/helpers";

describe("dashboard analytics", () => {
  it("shows six months, excludes transfers and loan principal, and respects voids", async () => {
    const { household, user } = await createTestHousehold();
    const checking = await createAccount(household.id, user.id, {
      name: "Checking", type: "CHECKING", institution: "", openingBalanceAed: "1000.00",
    });
    const savings = await createTestAccount(household.id, "Savings");
    const salary = await createTestCategory(household.id, "Salary", "INCOME");
    const food = await createTestCategory(household.id, "Food", "EXPENSE");

    await createTransaction(household.id, user.id, {
      type: "INCOME", accountId: checking.id, categoryId: salary.id,
      amountAed: "300.00", date: "2025-12-15", description: "",
    });
    await createTransaction(household.id, user.id, {
      type: "INCOME", accountId: checking.id, categoryId: salary.id,
      amountAed: "500.00", date: "2026-01-15", description: "",
    });
    await createTransaction(household.id, user.id, {
      type: "EXPENSE", accountId: checking.id, categoryId: food.id,
      amountAed: "100.00", date: "2026-01-16", description: "",
    });
    const removed = await createTransaction(household.id, user.id, {
      type: "EXPENSE", accountId: checking.id, categoryId: food.id,
      amountAed: "25.00", date: "2026-01-16", description: "",
    });
    await voidTransaction(household.id, user.id, removed.id);

    const loan = await createLoan(household.id, user.id, {
      name: "Loan", lender: "", originalAmountAed: "1000.00",
      openingBalanceAed: "1000.00", monthlyPaymentAed: "",
      interestRatePct: "", startDate: "",
    });
    await recordLoanPayment(household.id, user.id, {
      loanId: loan.id, accountId: checking.id, amountAed: "200.00",
      interestAed: "50.00", paymentDate: "2026-01-17", note: "",
    });
    await createTransfer(household.id, user.id, {
      fromAccountId: checking.id, toAccountId: savings.id,
      amountAed: "200.00", date: "2026-01-18", description: "",
    });

    const result = await getDashboardAnalytics(household.id, new Date(2026, 0, 20));
    expect(result.months).toHaveLength(6);
    expect(result.months[4]).toMatchObject({
      key: "2025-12", incomeFils: 30_000, spendingFils: 0,
    });
    expect(result.months[5]).toMatchObject({
      key: "2026-01", incomeFils: 50_000, spendingFils: 15_000,
    });
    expect(result.categories).toEqual([
      { name: "Food", amountFils: 10_000 },
      { name: "Loan Payment", amountFils: 5_000 },
    ]);
  });
});
