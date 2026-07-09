import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Seed script.
 *
 * Creates a working household with sample data so the dashboard shows real,
 * DERIVED figures on first launch. Opening balances are written as ADJUSTMENT
 * transactions — consistent with the ledger model, not a stored balance field.
 *
 * Re-running is safe: it clears existing data first.
 *
 * NOTE: amounts here are written in whole AED via aed(); everything is stored
 * as integer fils (AED * 100). Kept inline to avoid path-alias resolution in
 * the standalone tsx runtime.
 */
const prisma = new PrismaClient();

const aed = (n: number) => Math.round(n * 100); // AED -> fils

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function thisMonth(day: number): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), day);
}
function lastMonth(day: number): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 1, day);
}

async function main() {
  console.log("Clearing existing data\u2026");
  // Order respects foreign keys (children first).
  await prisma.auditLog.deleteMany();
  await prisma.loanPayment.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.assetValuation.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.account.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.user.deleteMany();
  await prisma.household.deleteMany();

  console.log("Creating household\u2026");
  const household = await prisma.household.create({
    data: { name: "The Family", currency: "AED" },
  });

  console.log("Creating users\u2026");
  const passwordHash = await bcrypt.hash("changeme123", 12);
  await prisma.user.createMany({
    data: [
      {
        householdId: household.id,
        email: "owner@fwms.local",
        name: "Family Owner",
        passwordHash,
        role: "OWNER",
      },
      {
        householdId: household.id,
        email: "member@fwms.local",
        name: "Family Member",
        passwordHash,
        role: "MEMBER",
      },
    ],
  });

  console.log("Creating categories\u2026");
  const incomeCats = ["Salary", "Business", "Rental", "Investment", "Other"];
  const expenseCats = [
    "Food",
    "Bills",
    "Transport",
    "Education",
    "Healthcare",
    "Shopping",
    "Other",
  ];
  await prisma.category.createMany({
    data: [
      ...incomeCats.map((name) => ({
        householdId: household.id,
        name,
        type: "INCOME" as const,
        color: "#12876A",
        isSystem: true,
      })),
      ...expenseCats.map((name) => ({
        householdId: household.id,
        name,
        type: "EXPENSE" as const,
        color: "#B4462F",
        isSystem: true,
      })),
    ],
  });
  const cats = await prisma.category.findMany({
    where: { householdId: household.id },
  });
  const cat = (name: string) => cats.find((c) => c.name === name)!.id;

  console.log("Creating accounts + opening balances\u2026");
  const checking = await prisma.account.create({
    data: {
      householdId: household.id,
      name: "Emirates NBD Checking",
      type: "CHECKING",
      institution: "Emirates NBD",
    },
  });
  const savings = await prisma.account.create({
    data: {
      householdId: household.id,
      name: "Savings",
      type: "SAVINGS",
      institution: "Emirates NBD",
    },
  });
  const cash = await prisma.account.create({
    data: { householdId: household.id, name: "Cash Wallet", type: "CASH" },
  });

  // Opening balances as ADJUSTMENT transactions (ledger-consistent).
  await prisma.transaction.createMany({
    data: [
      {
        householdId: household.id,
        accountId: checking.id,
        type: "ADJUSTMENT",
        amount: aed(42000),
        date: daysAgo(60),
        description: "Opening balance",
      },
      {
        householdId: household.id,
        accountId: savings.id,
        type: "ADJUSTMENT",
        amount: aed(180000),
        date: daysAgo(60),
        description: "Opening balance",
      },
      {
        householdId: household.id,
        accountId: cash.id,
        type: "ADJUSTMENT",
        amount: aed(3500),
        date: daysAgo(60),
        description: "Opening balance",
      },
    ],
  });

  console.log("Creating sample income & expenses\u2026");
  await prisma.transaction.createMany({
    data: [
      // This month — income
      {
        householdId: household.id,
        accountId: checking.id,
        type: "INCOME",
        amount: aed(28000),
        categoryId: cat("Salary"),
        date: thisMonth(1),
        description: "Monthly salary",
      },
      {
        householdId: household.id,
        accountId: checking.id,
        type: "INCOME",
        amount: aed(6500),
        categoryId: cat("Rental"),
        date: thisMonth(3),
        description: "Apartment rent received",
      },
      // This month — expenses (stored negative)
      {
        householdId: household.id,
        accountId: checking.id,
        type: "EXPENSE",
        amount: -aed(3200),
        categoryId: cat("Food"),
        date: thisMonth(5),
        description: "Groceries",
      },
      {
        householdId: household.id,
        accountId: checking.id,
        type: "EXPENSE",
        amount: -aed(1800),
        categoryId: cat("Bills"),
        date: thisMonth(6),
        description: "DEWA + Etisalat",
      },
      {
        householdId: household.id,
        accountId: cash.id,
        type: "EXPENSE",
        amount: -aed(950),
        categoryId: cat("Transport"),
        date: thisMonth(7),
        description: "Fuel + Salik",
      },
      {
        householdId: household.id,
        accountId: checking.id,
        type: "INCOME",
        amount: aed(2000),
        categoryId: cat("Investment"),
        date: thisMonth(4),
        description: "Dividend payout",
      },
      {
        householdId: household.id,
        accountId: checking.id,
        type: "EXPENSE",
        amount: -aed(650),
        categoryId: cat("Shopping"),
        date: thisMonth(8),
        description: "Clothing",
      },
      // Last month — for month-over-month insight
      {
        householdId: household.id,
        accountId: checking.id,
        type: "INCOME",
        amount: aed(28000),
        categoryId: cat("Salary"),
        date: lastMonth(1),
        description: "Monthly salary",
      },
      {
        householdId: household.id,
        accountId: checking.id,
        type: "EXPENSE",
        amount: -aed(4100),
        categoryId: cat("Food"),
        date: lastMonth(8),
        description: "Groceries + dining",
      },
    ],
  });

  console.log("Creating assets + valuations\u2026");
  const villa = await prisma.asset.create({
    data: {
      householdId: household.id,
      name: "Villa \u2014 Al Barsha",
      type: "REAL_ESTATE",
      purchaseValue: aed(2600000),
      purchaseDate: new Date("2019-05-01"),
      ownership: "Family (100%)",
    },
  });
  await prisma.assetValuation.create({
    data: {
      assetId: villa.id,
      value: aed(3150000),
      valuationDate: daysAgo(30),
      source: "estimate",
    },
  });

  const car = await prisma.asset.create({
    data: {
      householdId: household.id,
      name: "Toyota Land Cruiser",
      type: "VEHICLE",
      purchaseValue: aed(240000),
      purchaseDate: new Date("2022-02-01"),
      ownership: "Family (100%)",
    },
  });
  await prisma.assetValuation.create({
    data: {
      assetId: car.id,
      value: aed(185000),
      valuationDate: daysAgo(15),
      source: "estimate",
    },
  });

  console.log("Creating loan + payment\u2026");
  const mortgage = await prisma.loan.create({
    data: {
      householdId: household.id,
      name: "Home Mortgage",
      lender: "Emirates NBD",
      originalAmount: aed(1800000),
      openingBalance: aed(1250000),
      monthlyPayment: aed(9500),
      interestRate: 4.2,
      startDate: new Date("2019-06-01"),
    },
  });

  // Mirrors what loans.service.recordLoanPayment does for a real payment: a
  // "Loan Payment" EXPENSE category, a linked ledger Transaction debiting the
  // account it was paid from, and the LoanPayment row referencing it — so the
  // seeded mortgage payment shows up in cash/expense totals exactly like a
  // payment recorded through the UI would, rather than looking inconsistent
  // with it.
  const loanPaymentCategory = await prisma.category.create({
    data: {
      householdId: household.id,
      name: "Loan Payment",
      type: "EXPENSE",
      isSystem: true,
    },
  });
  const mortgagePaymentDate = thisMonth(2);
  const mortgageTransaction = await prisma.transaction.create({
    data: {
      householdId: household.id,
      accountId: checking.id,
      type: "EXPENSE",
      amount: -aed(9500),
      categoryId: loanPaymentCategory.id,
      date: mortgagePaymentDate,
      description: "Loan payment \u2014 Home Mortgage",
    },
  });
  await prisma.loanPayment.create({
    data: {
      loanId: mortgage.id,
      amount: aed(9500),
      principal: aed(5200),
      interest: aed(4300),
      paymentDate: mortgagePaymentDate,
      note: "Monthly instalment",
      transactionId: mortgageTransaction.id,
    },
  });

  console.log("\nSeed complete.");
  console.log("Login with:");
  console.log("  owner@fwms.local  / changeme123  (OWNER)");
  console.log("  member@fwms.local / changeme123  (MEMBER)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
