import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createTransaction,
  voidTransaction,
  listTransactionsByType,
  TransactionValidationError,
} from "@/services/transactions.service";
import { getTotalCashFils } from "@/services/summary.service";
import { createTestHousehold, createTestAccount, createTestCategory } from "../setup/helpers";

describe("transactions.service", () => {
  it("stores INCOME as a positive amount and includes it in the account's cash total", async () => {
    const { household, user } = await createTestHousehold();
    const account = await createTestAccount(household.id);
    const category = await createTestCategory(household.id, "Salary", "INCOME");

    await createTransaction(household.id, user.id, {
      type: "INCOME",
      accountId: account.id,
      categoryId: category.id,
      amountAed: "5000.00",
      date: "2026-01-15",
      description: "Test salary",
    });

    const cash = await getTotalCashFils(household.id);
    expect(cash).toBe(500_000);
  });

  it("stores EXPENSE as a negative amount", async () => {
    const { household, user } = await createTestHousehold();
    const account = await createTestAccount(household.id);
    const category = await createTestCategory(household.id, "Food", "EXPENSE");

    const created = await createTransaction(household.id, user.id, {
      type: "EXPENSE",
      accountId: account.id,
      categoryId: category.id,
      amountAed: "120.00",
      date: "2026-01-15",
      description: "Groceries",
    });

    expect(created.amount).toBe(-12_000);
  });

  it("rejects a category whose type doesn't match the transaction type", async () => {
    const { household, user } = await createTestHousehold();
    const account = await createTestAccount(household.id);
    const expenseCategory = await createTestCategory(household.id, "Food", "EXPENSE");

    await expect(
      createTransaction(household.id, user.id, {
        type: "INCOME",
        accountId: account.id,
        categoryId: expenseCategory.id,
        amountAed: "100.00",
        date: "2026-01-15",
        description: "",
      })
    ).rejects.toThrow(TransactionValidationError);
  });

  it("rejects an account belonging to a different household (no cross-household leakage)", async () => {
    const { household: householdA, user: userA } = await createTestHousehold();
    const { household: householdB } = await createTestHousehold();
    const accountInB = await createTestAccount(householdB.id);
    const categoryInA = await createTestCategory(householdA.id, "Salary", "INCOME");

    await expect(
      createTransaction(householdA.id, userA.id, {
        type: "INCOME",
        accountId: accountInB.id,
        categoryId: categoryInA.id,
        amountAed: "100.00",
        date: "2026-01-15",
        description: "",
      })
    ).rejects.toThrow(TransactionValidationError);
  });

  it("rejects an inactive account", async () => {
    const { household, user } = await createTestHousehold();
    const account = await prisma.account.create({
      data: { householdId: household.id, name: "Closed", type: "CHECKING", isActive: false },
    });
    const category = await createTestCategory(household.id, "Salary", "INCOME");

    await expect(
      createTransaction(household.id, user.id, {
        type: "INCOME",
        accountId: account.id,
        categoryId: category.id,
        amountAed: "100.00",
        date: "2026-01-15",
        description: "",
      })
    ).rejects.toThrow(TransactionValidationError);
  });

  it("excludes a voided transaction from history and from cash totals", async () => {
    const { household, user } = await createTestHousehold();
    const account = await createTestAccount(household.id);
    const category = await createTestCategory(household.id, "Salary", "INCOME");

    const created = await createTransaction(household.id, user.id, {
      type: "INCOME",
      accountId: account.id,
      categoryId: category.id,
      amountAed: "1000.00",
      date: "2026-01-15",
      description: "",
    });

    expect(await getTotalCashFils(household.id)).toBe(100_000);

    await voidTransaction(household.id, user.id, created.id);

    expect(await getTotalCashFils(household.id)).toBe(0);
    const history = await listTransactionsByType(household.id, "INCOME");
    expect(history.find((t) => t.id === created.id)).toBeUndefined();

    // The row itself still exists, marked VOID — not hard-deleted.
    const raw = await prisma.transaction.findUnique({ where: { id: created.id } });
    expect(raw?.status).toBe("VOID");
  });

  it("refuses to void an already-voided transaction", async () => {
    const { household, user } = await createTestHousehold();
    const account = await createTestAccount(household.id);
    const category = await createTestCategory(household.id, "Salary", "INCOME");
    const created = await createTransaction(household.id, user.id, {
      type: "INCOME",
      accountId: account.id,
      categoryId: category.id,
      amountAed: "1000.00",
      date: "2026-01-15",
      description: "",
    });

    await voidTransaction(household.id, user.id, created.id);
    await expect(voidTransaction(household.id, user.id, created.id)).rejects.toThrow(
      TransactionValidationError
    );
  });

  it("refuses to void a transaction that doesn't exist", async () => {
    const { household, user } = await createTestHousehold();
    await expect(
      voidTransaction(household.id, user.id, "not-a-real-id")
    ).rejects.toThrow(TransactionValidationError);
  });

  it("finds transactions by description, category name, and account name via search", async () => {
    const { household, user } = await createTestHousehold();
    const account = await createTestAccount(household.id, "Emirates NBD Checking");
    const category = await createTestCategory(household.id, "Groceries", "EXPENSE");

    await createTransaction(household.id, user.id, {
      type: "EXPENSE",
      accountId: account.id,
      categoryId: category.id,
      amountAed: "80.00",
      date: "2026-01-15",
      description: "Weekly shop",
    });

    const byDescription = await listTransactionsByType(household.id, "EXPENSE", { search: "weekly" });
    expect(byDescription).toHaveLength(1);

    const byCategory = await listTransactionsByType(household.id, "EXPENSE", { search: "grocer" });
    expect(byCategory).toHaveLength(1);

    const byAccount = await listTransactionsByType(household.id, "EXPENSE", { search: "emirates" });
    expect(byAccount).toHaveLength(1);

    const noMatch = await listTransactionsByType(household.id, "EXPENSE", { search: "nonexistent" });
    expect(noMatch).toHaveLength(0);
  });
});
