import { prisma } from "@/lib/prisma";

export async function getHouseholdCurrency(householdId: string): Promise<string> {
  const household = await prisma.household.findUniqueOrThrow({
    where: { id: householdId }, select: { currency: true },
  });
  return household.currency;
}
