import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { CategoryCreateInput } from "@/lib/validators";
import type { CategoryType } from "@/lib/constants";

export class CategoryValidationError extends Error {}

/** List a household's categories, optionally filtered to one type. */
export async function listCategories(householdId: string, type?: CategoryType) {
  return prisma.category.findMany({
    where: { householdId, ...(type ? { type } : {}) },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
}

/**
 * Create a custom category. Callers (Server Actions) are responsible for
 * confirming the requester is an OWNER — this function only enforces
 * data-level rules.
 *
 * Duplicate detection is case-INsensitive ("Food" vs "food"): the schema's
 * `@@unique([householdId, name, type])` constraint only catches exact
 * matches (SQLite's default text comparison is case-sensitive), so relying
 * on it alone would let a household end up with both "Food" and "food" as
 * separate categories — a real data-quality edge case, not just a
 * theoretical one, since category names are free-typed by an OWNER.
 */
export async function createCategory(
  householdId: string,
  userId: string,
  input: CategoryCreateInput
) {
  const nameLower = input.name.toLowerCase();
  const sameTypeCategories = await prisma.category.findMany({
    where: { householdId, type: input.type },
    select: { name: true },
  });
  if (sameTypeCategories.some((c) => c.name.toLowerCase() === nameLower)) {
    throw new CategoryValidationError(
      `A ${input.type.toLowerCase()} category named "${input.name}" already exists.`
    );
  }

  return prisma.$transaction(async (tx) => {
    const category = await tx.category.create({
      data: {
        householdId,
        name: input.name,
        type: input.type,
        isSystem: false,
      },
    });

    await logAudit(
      {
        householdId,
        userId,
        action: "CREATE",
        entity: "Category",
        entityId: category.id,
        summary: `Created ${input.type.toLowerCase()} category "${category.name}"`,
      },
      tx
    );

    return category;
  });
}
