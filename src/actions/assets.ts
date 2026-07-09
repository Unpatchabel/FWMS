"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, canWrite } from "@/lib/auth";
import { assetCreateSchema, assetValuationCreateSchema } from "@/lib/validators";
import {
  createAsset,
  recordAssetValuation,
  AssetValidationError,
} from "@/services/assets.service";
import type { ActionResult } from "./types";

function refreshAssetPages() {
  revalidatePath("/dashboard");
  revalidatePath("/assets");
}

export async function createAssetAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Sign in again." };
  if (!canWrite(user)) return { ok: false, error: "Viewers can't add assets." };

  const parsed = assetCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const asset = await createAsset(user.householdId, user.id, parsed.data);
  refreshAssetPages();
  return { ok: true, data: { id: asset.id } };
}

export async function recordAssetValuationAction(
  input: unknown
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Sign in again." };
  if (!canWrite(user)) return { ok: false, error: "Viewers can't update valuations." };

  const parsed = assetValuationCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await recordAssetValuation(user.householdId, user.id, parsed.data);
    refreshAssetPages();
    return { ok: true };
  } catch (err) {
    if (err instanceof AssetValidationError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }
}
