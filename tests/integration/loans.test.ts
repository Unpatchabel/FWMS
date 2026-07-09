import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { createLoan, recordLoanPayment, listLoans, LoanValidationError } from "@/services/loans.service";
import { createAccount, listAccounts } from "@/services/accounts.service";
import { voidTransaction, TransactionValidationError } from "@/services/transactions.service";
import { getTotalCashFils, getMonthlyFlow } from "@/services/summary.service";
import { createTestHousehold } from "../setup/helpers";

async function setupLoanScenario(overrides: Partial<Parameters<typeof createLoan>[2]> = {}) {
  const { household, user } = await createTestHousehold();
  const account = await createAccount(household.id, user.id, {
    name: "Checking",
    type: "CHECKING",
    institution: "",
    openingBalanceAed: "50000.00",
  });
  const loan = await createLoan(household.id, user.id, {
    name: "Test Mortgage",
    lender: "Test Bank",
    originalAmountAed: "500000.00",
    openingBalanceAed: "400000.00",
    monthlyPaymentAed: "",
    interestRatePct: "",
    startDate: "",
    ...overrides,
  });
  return { household, user, account, loan };
}

describe("loans.service — remaining balance", () => {
  it("derives remaining balance as opening balance minus principal paid", async () => {
    const { household, user, account, loan } = await setupLoanScenario();

    await recordLoanPayment(household.id, user.id, {
      loanId: loan.id,
      accountId: account.id,
      amountAed: "2000.00",
      interestAed: "800.00",
      paymentDate: "2026-01-15",
      note: "",
    });

    const loans = await listLoans(household.id);
    const updated = loans.find((l) => l.id === loan.id)!;
    // opening 400,000 - principal (2000 - 800 = 1200) = 398,800
    expect(updated.remainingBalanceFils).toBe(39_880_000);
  });
});

describe("loans.service — ledger integration (recordLoanPayment)", () => {
  it("debits the chosen account, creates a linked EXPENSE transaction, and reduces the loan balance atomically", async () => {
    const { household, user, account, loan } = await setupLoanScenario();

    const cashBefore = await getTotalCashFils(household.id);
    expect(cashBefore).toBe(5_000_000); // 50,000 AED opening balance

    const payment = await recordLoanPayment(household.id, user.id, {
      loanId: loan.id,
      accountId: account.id,
      amountAed: "1500.00",
      interestAed: "600.00",
      paymentDate: "2026-01-20",
      note: "Monthly instalment",
    });

    // Cash reduced by the full payment amount.
    const cashAfter = await getTotalCashFils(household.id);
    expect(cashAfter).toBe(cashBefore - 150_000);

    // Linked transaction exists, is an EXPENSE, and is negative.
    expect(payment.transactionId).not.toBeNull();
    const linkedTx = await prisma.transaction.findUnique({
      where: { id: payment.transactionId! },
    });
    expect(linkedTx?.type).toBe("EXPENSE");
    expect(linkedTx?.amount).toBe(-150_000);
    expect(linkedTx?.accountId).toBe(account.id);

    // Loan balance reduced by the principal portion (1500 - 600 = 900 AED).
    const loans = await listLoans(household.id);
    const updated = loans.find((l) => l.id === loan.id)!;
    expect(updated.remainingBalanceFils).toBe(40_000_000 - 90_000);

    // Shows up in monthly cash flow like any other expense.
    const flow = await getMonthlyFlow(household.id, new Date("2026-01-20"));
    expect(flow.expensesFils).toBe(150_000);

    // Account's derived balance also reflects it.
    const accounts = await listAccounts(household.id);
    expect(accounts.find((a) => a.id === account.id)?.balanceFils).toBe(cashAfter);
  });

  it("reuses the same 'Loan Payment' category across multiple payments rather than creating duplicates", async () => {
    const { household, user, account, loan } = await setupLoanScenario();

    await recordLoanPayment(household.id, user.id, {
      loanId: loan.id,
      accountId: account.id,
      amountAed: "100.00",
      interestAed: "0",
      paymentDate: "2026-01-01",
      note: "",
    });
    await recordLoanPayment(household.id, user.id, {
      loanId: loan.id,
      accountId: account.id,
      amountAed: "100.00",
      interestAed: "0",
      paymentDate: "2026-02-01",
      note: "",
    });

    const categories = await prisma.category.findMany({
      where: { householdId: household.id, name: "Loan Payment", type: "EXPENSE" },
    });
    expect(categories).toHaveLength(1);
  });

  it("rejects interest exceeding the payment amount and rolls back atomically (no orphan rows)", async () => {
    const { household, user, account, loan } = await setupLoanScenario();

    await expect(
      recordLoanPayment(household.id, user.id, {
        loanId: loan.id,
        accountId: account.id,
        amountAed: "500.00",
        interestAed: "600.00",
        paymentDate: "2026-01-15",
        note: "",
      })
    ).rejects.toThrow(LoanValidationError);

    // Nothing was left behind: no LoanPayment, no linked Transaction, cash unchanged.
    const payments = await prisma.loanPayment.findMany({ where: { loanId: loan.id } });
    expect(payments).toHaveLength(0);
    const cash = await getTotalCashFils(household.id);
    expect(cash).toBe(5_000_000); // still just the opening balance
  });

  it("rejects a payment whose principal would exceed the loan's current remaining balance", async () => {
    const { household, user, account, loan } = await setupLoanScenario({
      openingBalanceAed: "1000.00",
    });

    await expect(
      recordLoanPayment(household.id, user.id, {
        loanId: loan.id,
        accountId: account.id,
        amountAed: "1500.00", // principal would be 1500 (interest 0) > 1000 remaining
        interestAed: "0",
        paymentDate: "2026-01-15",
        note: "",
      })
    ).rejects.toThrow(LoanValidationError);

    const cash = await getTotalCashFils(household.id);
    expect(cash).toBe(5_000_000); // unchanged — the whole attempt rolled back
  });

  it("rejects an invalid account and rolls back atomically", async () => {
    const { household, user, loan } = await setupLoanScenario();

    await expect(
      recordLoanPayment(household.id, user.id, {
        loanId: loan.id,
        accountId: "not-a-real-account",
        amountAed: "100.00",
        interestAed: "0",
        paymentDate: "2026-01-15",
        note: "",
      })
    ).rejects.toThrow(LoanValidationError);

    const payments = await prisma.loanPayment.findMany({ where: { loanId: loan.id } });
    expect(payments).toHaveLength(0);
  });

  it("refuses to void a transaction that was created by a loan payment", async () => {
    const { household, user, account, loan } = await setupLoanScenario();

    const payment = await recordLoanPayment(household.id, user.id, {
      loanId: loan.id,
      accountId: account.id,
      amountAed: "500.00",
      interestAed: "200.00",
      paymentDate: "2026-01-15",
      note: "",
    });

    await expect(
      voidTransaction(household.id, user.id, payment.transactionId!)
    ).rejects.toThrow(TransactionValidationError);

    // It's still there, still ACTIVE, and the loan balance is unaffected by the attempt.
    const linkedTx = await prisma.transaction.findUnique({ where: { id: payment.transactionId! } });
    expect(linkedTx?.status).toBe("ACTIVE");
  });
});
