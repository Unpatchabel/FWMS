"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, isOwner } from "@/lib/auth";
import { categoryCreateSchema } from "@/lib/validators";
import { createCategory, CategoryValidationError } from "@/services/categories.service";
import type { ActionResult } from "./types";

/**
 * Create a custom category. Admin-controlled: only OWNER may add categories.
 * Enforced here regardless of what the UI shows or hides.
 */
export async function createCategoryAction(
  input: unknown
): Promise<ActionResult<{ id: string; name: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Sign in again." };
  if (!isOwner(user)) {
    return { ok: false, error: "Only the account owner can add new categories." };
  }

  const parsed = categoryCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const category = await createCategory(user.householdId, user.id, parsed.data);
    revalidatePath("/income");
    revalidatePath("/expenses");
    return { ok: true, data: { id: category.id, name: category.name } };
  } catch (err) {
    if (err instanceof CategoryValidationError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }
}
