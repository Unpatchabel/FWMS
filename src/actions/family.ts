"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentUser, isOwner } from "@/lib/auth";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import {
  familyMemberCreateSchema, familyRoleSchema, familyAccessSchema, changePasswordSchema,
} from "@/lib/validators";
import {
  createFamilyMember, changeFamilyRole, changeFamilyAccess, changeOwnPassword, FamilyValidationError,
} from "@/services/family.service";
import type { ActionResult } from "./types";

function expectedError(error: unknown): ActionResult {
  if (error instanceof FamilyValidationError) return { ok: false, error: error.message };
  throw error;
}

export async function createFamilyMemberAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Sign in again." };
  if (!isOwner(user)) return { ok: false, error: "Only owners can add people." };
  const parsed = familyMemberCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const member = await createFamilyMember(user.householdId, user.id, parsed.data);
    revalidatePath("/family");
    return { ok: true, data: { id: member.id } };
  } catch (error) { return expectedError(error); }
}

export async function changeFamilyRoleAction(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Sign in again." };
  if (!isOwner(user)) return { ok: false, error: "Only owners can change roles." };
  const parsed = familyRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    await changeFamilyRole(user.householdId, user.id, parsed.data);
    revalidatePath("/family");
    return { ok: true };
  } catch (error) { return expectedError(error); }
}

export async function changeFamilyAccessAction(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Sign in again." };
  if (!isOwner(user)) return { ok: false, error: "Only owners can change access." };
  const parsed = familyAccessSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    await changeFamilyAccess(user.householdId, user.id, parsed.data);
    revalidatePath("/family");
    return { ok: true };
  } catch (error) { return expectedError(error); }
}

export async function changeOwnPasswordAction(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Sign in again." };
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    await changeOwnPassword(user.householdId, user.id, parsed.data);
    cookies().set(SESSION_COOKIE, "", sessionCookieOptions(0));
    revalidatePath("/family");
    return { ok: true };
  } catch (error) { return expectedError(error); }
}
