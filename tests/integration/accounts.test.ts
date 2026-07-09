import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { createAccount, listAccounts } from "@/services/accounts.service";
import { createTestHousehold } from "../setup/helpers";

describe("accounts.service", () => {
  it("creates an account with a zero balance when no opening balance is given", async () => {
    const { household, user } = await createTestHousehold();

    const account = await createAccount(household.id, user.id, {
      name: "New Wallet",
      type: "CASH",
      institution: "",
      openingBalanceAed: "",
    });

    expect(account.balanceFils).toBe(0);
    const accounts = await listAccounts(household.id);
    expect(accounts.find((a) => a.id === account.id)?.balanceFils).toBe(0);
  });

  it("records an opening balance as a real ADJUSTMENT transaction, not a stored field", async () => {
    const { household, user } = await createTestHousehold();

    const account = await createAccount(household.id, user.id, {
      name: "Savings",
      type: "SAVINGS",
      institution: "Test Bank",
      openingBalanceAed: "1500.00",
    });

    expect(account.balanceFils).toBe(150_000);

    const adjustmentRows = await prisma.transaction.findMany({
      where: { accountId: account.id, type: "ADJUSTMENT" },
    });
    expect(adjustmentRows).toHaveLength(1);
    expect(adjustmentRows[0].amount).toBe(150_000);
    expect(adjustmentRows[0].description).toBe("Opening balance");

    // Balance is derived by summing transactions, not read from a stored column.
    const accounts = await listAccounts(household.id);
    expect(accounts.find((a) => a.id === account.id)?.balanceFils).toBe(150_000);
  });

  it("supports a negative opening balance (e.g. a credit card already in debt)", async () => {
    const { household, user } = await createTestHousehold();

    const account = await createAccount(household.id, user.id, {
      name: "Credit Card",
      type: "OTHER",
      institution: "",
      openingBalanceAed: "-2500.00",
    });

    expect(account.balanceFils).toBe(-250_000);
  });

  it("writes an audit log entry for the account creation", async () => {
    const { household, user } = await createTestHousehold();
    const account = await createAccount(household.id, user.id, {
      name: "Audited Account",
      type: "CHECKING",
      institution: "",
      openingBalanceAed: "",
    });

    const logs = await prisma.auditLog.findMany({
      where: { householdId: household.id, entity: "Account", entityId: account.id },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("CREATE");
  });
});
