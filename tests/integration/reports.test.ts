import { describe, expect, it } from "vitest";
import { getMonthlyReport } from "@/services/reports.service";
import { createAccount } from "@/services/accounts.service";
import { createLoan, recordLoanPayment } from "@/services/loans.service";
import { createTransaction, createTransfer, voidTransaction } from "@/services/transactions.service";
import { createTestAccount, createTestCategory, createTestHousehold } from "../setup/helpers";

describe("monthly reports", () => {
  it("reconciles cash paid with spending and principal while isolating the household", async () => {
    const { household, user } = await createTestHousehold();
    const checking = await createAccount(household.id, user.id, {
      name: "Checking", type: "CHECKING", institution: "", openingBalanceAed: "1000.00",
    });
    const savings = await createTestAccount(household.id, "Savings");
    const salary = await createTestCategory(household.id, "Salary", "INCOME");
    const food = await createTestCategory(household.id, "Food", "EXPENSE");

    await createTransaction(household.id, user.id, {
      type: "INCOME", accountId: checking.id, categoryId: salary.id,
      amountAed: "500.00", date: "2026-01-01", description: "",
    });
    await createTransaction(household.id, user.id, {
      type: "EXPENSE", accountId: checking.id, categoryId: food.id,
      amountAed: "100.00", date: "2026-01-31", description: "",
    });
    const voided = await createTransaction(household.id, user.id, {
      type: "EXPENSE", accountId: checking.id, categoryId: food.id,
      amountAed: "40.00", date: "2026-01-03", description: "",
    });
    await voidTransaction(household.id, user.id, voided.id);
    await createTransaction(household.id, user.id, {
      type: "EXPENSE", accountId: checking.id, categoryId: food.id,
      amountAed: "25.00", date: "2026-02-01", description: "",
    });

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

    const other = await createTestHousehold();
    const otherAccount = await createTestAccount(other.household.id);
    const otherCategory = await createTestCategory(other.household.id, "Food", "EXPENSE");
    await createTransaction(other.household.id, other.user.id, {
      type: "EXPENSE", accountId: otherAccount.id, categoryId: otherCategory.id,
      amountAed: "999.00", date: "2026-01-10", description: "",
    });

    const report = await getMonthlyReport(household.id, new Date(2026, 0, 20));
    expect(report).toMatchObject({
      incomeFils: 50_000,
      spendingFils: 15_000,
      principalPaidFils: 15_000,
      cashPaidFils: 30_000,
      remainingFils: 35_000,
      savingsRatePct: 70,
      incomeCategories: [{ name: "Salary", amountFils: 50_000 }],
      spendingCategories: [
        { name: "Food", amountFils: 10_000 },
        { name: "Loan Payment", amountFils: 5_000 },
      ],
    });
  });

  it("shows zero totals and no savings rate in an empty month", async () => {
    const { household } = await createTestHousehold();
    const report = await getMonthlyReport(household.id, new Date(2026, 3, 1));
    expect(report.incomeFils).toBe(0);
    expect(report.spendingFils).toBe(0);
    expect(report.savingsRatePct).toBeNull();
    expect(report.spendingCategories).toEqual([]);
  });
});
