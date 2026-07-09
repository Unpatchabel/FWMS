import { describe, it, expect } from "vitest";
import { createAccount } from "@/services/accounts.service";
import { createTransaction } from "@/services/transactions.service";
import { createAsset, recordAssetValuation } from "@/services/assets.service";
import { createLoan, recordLoanPayment } from "@/services/loans.service";
import { getFinancialSummary } from "@/services/summary.service";
import { createTestHousehold, createTestCategory } from "../setup/helpers";

describe("summary.service — net worth end-to-end", () => {
  it("computes net worth as cash + assets - liabilities from a small realistic scenario", async () => {
    const { household, user } = await createTestHousehold();

    // Cash: one account, opening balance + a bit of income and an expense.
    const account = await createAccount(household.id, user.id, {
      name: "Checking",
      type: "CHECKING",
      institution: "",
      openingBalanceAed: "10000.00",
    });
    const salaryCategory = await createTestCategory(household.id, "Salary", "INCOME");
    const foodCategory = await createTestCategory(household.id, "Food", "EXPENSE");

    await createTransaction(household.id, user.id, {
      type: "INCOME",
      accountId: account.id,
      categoryId: salaryCategory.id,
      amountAed: "5000.00",
      date: "2026-01-05",
      description: "Salary",
    });
    await createTransaction(household.id, user.id, {
      type: "EXPENSE",
      accountId: account.id,
      categoryId: foodCategory.id,
      amountAed: "300.00",
      date: "2026-01-06",
      description: "Groceries",
    });
    // cash so far: 10,000 + 5,000 - 300 = 14,700 AED

    // Assets: purchase value with a later valuation, plus one never valued.
    const car = await createAsset(household.id, user.id, {
      name: "Car",
      type: "VEHICLE",
      purchaseValueAed: "80000.00",
      purchaseDate: "",
      ownership: "",
      notes: "",
    });
    await recordAssetValuation(household.id, user.id, {
      assetId: car.id,
      valueAed: "65000.00",
      valuationDate: "2026-01-10",
      source: "estimate",
    });
    await createAsset(household.id, user.id, {
      name: "Jewelry",
      type: "OTHER",
      purchaseValueAed: "5000.00",
      purchaseDate: "",
      ownership: "",
      notes: "",
    });
    // assets total: 65,000 (car, valued) + 5,000 (jewelry, no valuation -> purchase price) = 70,000 AED

    // Liabilities: a loan with one payment against it, debited from the same account.
    const loan = await createLoan(household.id, user.id, {
      name: "Car Loan",
      lender: "",
      originalAmountAed: "60000.00",
      openingBalanceAed: "40000.00",
      monthlyPaymentAed: "",
      interestRatePct: "",
      startDate: "",
    });
    await recordLoanPayment(household.id, user.id, {
      loanId: loan.id,
      accountId: account.id,
      amountAed: "1000.00",
      interestAed: "200.00",
      paymentDate: "2026-01-15",
      note: "",
    });
    // liabilities: 40,000 - (1,000 - 200) = 39,200 AED
    // cash after the loan payment too: 14,700 - 1,000 = 13,700 AED

    const summary = await getFinancialSummary(household.id);

    expect(summary.cashFils).toBe(1_370_000); // 13,700 AED
    expect(summary.assetsFils).toBe(7_000_000); // 70,000 AED
    expect(summary.liabilitiesFils).toBe(3_920_000); // 39,200 AED
    // net worth = 13,700 + 70,000 - 39,200 = 44,500 AED
    expect(summary.netWorthFils).toBe(4_450_000);
  });

  it("reports null savings rate when there is no income this month, without crashing", async () => {
    const { household, user } = await createTestHousehold();
    const account = await createAccount(household.id, user.id, {
      name: "Checking",
      type: "CHECKING",
      institution: "",
      openingBalanceAed: "1000.00",
    });
    const foodCategory = await createTestCategory(household.id, "Food", "EXPENSE");

    const now = new Date();
    const isoToday = now.toISOString().slice(0, 10);
    await createTransaction(household.id, user.id, {
      type: "EXPENSE",
      accountId: account.id,
      categoryId: foodCategory.id,
      amountAed: "50.00",
      date: isoToday,
      description: "",
    });

    const summary = await getFinancialSummary(household.id);
    expect(summary.incomeThisMonthFils).toBe(0);
    expect(summary.savingsRatePct).toBeNull();
  });
});
