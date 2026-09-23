import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createAccount, listAccounts } from "@/services/accounts.service";
import {
  createTransfer,
  listTransfers,
  voidTransaction,
  TransactionValidationError,
} from "@/services/transactions.service";
import { getMonthlyFlow, getRecentTransactions, getTotalCashFils } from "@/services/summary.service";
import { createTestAccount, createTestHousehold } from "../setup/helpers";

describe("account transfers", () => {
  it("moves money atomically without changing household cash or monthly flow", async () => {
    const { household, user } = await createTestHousehold();
    const source = await createAccount(household.id, user.id, {
      name: "Checking", type: "CHECKING", institution: "", openingBalanceAed: "1000.00",
    });
    const destination = await createTestAccount(household.id, "Savings");

    const result = await createTransfer(household.id, user.id, {
      fromAccountId: source.id,
      toAccountId: destination.id,
      amountAed: "200.00",
      date: "2026-01-20",
      description: "Monthly savings",
    });

    expect(result.debit.amount).toBe(-20_000);
    expect(result.credit.amount).toBe(20_000);
    expect(result.debit.transferGroupId).toBe(result.credit.transferGroupId);
    expect(result.debit.transferAccountId).toBe(destination.id);
    expect(result.credit.transferAccountId).toBe(source.id);

    const accounts = await listAccounts(household.id);
    expect(accounts.find((a) => a.id === source.id)?.balanceFils).toBe(80_000);
    expect(accounts.find((a) => a.id === destination.id)?.balanceFils).toBe(20_000);
    expect(await getTotalCashFils(household.id)).toBe(100_000);
    expect(await getMonthlyFlow(household.id, new Date("2026-01-20"))).toEqual({
      incomeFils: 0, expensesFils: 0,
    });

    const history = await listTransfers(household.id);
    expect(history).toHaveLength(1);
    expect(history[0].account.name).toBe("Checking");
    expect(history[0].transferAccount?.name).toBe("Savings");
    const recent = await getRecentTransactions(household.id);
    expect(recent.filter((row) => row.type === "TRANSFER")).toHaveLength(1);
    await expect(voidTransaction(household.id, user.id, result.debit.id))
      .rejects.toThrow(TransactionValidationError);
    await expect(voidTransaction(household.id, user.id, result.credit.id))
      .rejects.toThrow(TransactionValidationError);
  });

  it("rejects an account from another household without writing either half", async () => {
    const { household, user } = await createTestHousehold();
    const own = await createTestAccount(household.id);
    const { household: otherHousehold } = await createTestHousehold();
    const other = await createTestAccount(otherHousehold.id);

    await expect(createTransfer(household.id, user.id, {
      fromAccountId: own.id, toAccountId: other.id,
      amountAed: "50.00", date: "2026-01-20", description: "",
    })).rejects.toThrow(TransactionValidationError);

    expect(await prisma.transaction.count({
      where: { householdId: household.id, type: "TRANSFER" },
    })).toBe(0);
  });

  it("rejects a transfer to the same account", async () => {
    const { household, user } = await createTestHousehold();
    const account = await createTestAccount(household.id);

    await expect(createTransfer(household.id, user.id, {
      fromAccountId: account.id, toAccountId: account.id,
      amountAed: "10.00", date: "2026-01-20", description: "",
    })).rejects.toThrow(TransactionValidationError);
    expect(await listTransfers(household.id)).toHaveLength(0);
  });
});
