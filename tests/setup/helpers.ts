import { prisma } from "@/lib/prisma";

/**
 * Creates a fresh Household + OWNER User for a single test. Because almost
 * every query in the app is scoped by householdId, giving each test its own
 * household makes tests independent of each other and of execution order,
 * without needing to wipe the whole database between tests.
 */
export async function createTestHousehold(namePrefix = "Test") {
  const household = await prisma.household.create({
    data: { name: `${namePrefix} ${Date.now()}-${Math.random().toString(36).slice(2)}`, currency: "AED" },
  });
  const user = await prisma.user.create({
    data: {
      householdId: household.id,
      email: `${household.id}@example.test`,
      name: "Test Owner",
      passwordHash: "unused-in-tests",
      role: "OWNER",
    },
  });
  return { household, user };
}

export async function createTestAccount(householdId: string, name = "Test Checking") {
  return prisma.account.create({
    data: { householdId, name, type: "CHECKING" },
  });
}

export async function createTestCategory(
  householdId: string,
  name: string,
  type: "INCOME" | "EXPENSE"
) {
  return prisma.category.create({ data: { householdId, name, type } });
}
