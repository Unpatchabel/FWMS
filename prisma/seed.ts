import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Bootstrap an empty installation. Never overwrite an existing household.
const prisma = new PrismaClient();

async function main() {
  if (await prisma.household.count()) {
    throw new Error("Setup stopped: this database already has a household. Existing data was not changed.");
  }

  const email = process.env.FWMS_OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.FWMS_OWNER_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 12) {
    throw new Error("Set FWMS_OWNER_EMAIL and FWMS_OWNER_PASSWORD (at least 12 characters) in .env before setup.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction(async (tx) => {
    const household = await tx.household.create({
      data: { name: "My finances", currency: "AED" },
    });

    await tx.user.create({
      data: {
        householdId: household.id,
        email,
        name: "Owner",
        passwordHash,
        role: "OWNER",
      },
    });

    const income = ["Salary", "Business", "Rental", "Investment", "Other"];
    const expense = ["Food", "Bills", "Transport", "Education", "Healthcare", "Shopping", "Other"];
    await tx.category.createMany({
      data: [
        ...income.map((name) => ({ householdId: household.id, name, type: "INCOME", color: "#12876A", isSystem: true })),
        ...expense.map((name) => ({ householdId: household.id, name, type: "EXPENSE", color: "#B4462F", isSystem: true })),
      ],
    });
  });

  console.log(`Empty FWMS household created for ${email}. Sign in with the password from .env.`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
