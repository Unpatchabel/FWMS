import type { Prisma } from "@prisma/client";
import { assetCreateSchema, assetValuationCreateSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { aedToFils } from "@/lib/money";
import { logAudit } from "@/lib/audit";
import { parseFormDate } from "@/lib/dates";
import { deriveAssetCurrentValue } from "@/lib/ledger-math";
import type { AssetCreateInput, AssetValuationCreateInput } from "@/lib/validators";

export class AssetValidationError extends Error {}

export interface AssetWithValue {
  id: string;
  name: string;
  type: string;
  purchaseValueFils: number;
  purchaseDate: Date | null;
  ownership: string | null;
  notes: string | null;
  /** Latest recorded valuation, or purchaseValue when none has been recorded yet. */
  currentValueFils: number;
  /** Date of the latest valuation, or null when using purchaseValue as a fallback. */
  valuedAsOf: Date | null;
}

/**
 * List active assets — real estate, land plots, vehicles, investments, and
 * everything else — with their DERIVED current value. History is never
 * overwritten: "current value" is always the most recent AssetValuation row,
 * falling back to the original purchase price if no valuation has been
 * recorded yet, so appreciation/depreciation stays chartable over time.
 */
export async function listAssets(householdId: string, db: Prisma.TransactionClient = prisma): Promise<AssetWithValue[]> {
  const assets = await db.asset.findMany({
    where: { householdId, isActive: true },
    orderBy: { createdAt: "asc" },
    include: {
      valuations: { orderBy: [{ valuationDate: "desc" }, { createdAt: "desc" }, { id: "desc" }], take: 1 },
    },
  });

  return assets.map((a) => {
    const latest = a.valuations[0];
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      purchaseValueFils: a.purchaseValue,
      purchaseDate: a.purchaseDate,
      ownership: a.ownership,
      notes: a.notes,
      currentValueFils: deriveAssetCurrentValue(a.purchaseValue, latest?.value),
      valuedAsOf: latest?.valuationDate ?? null,
    };
  });
}

/** Create an asset (of any type) at its purchase value. No valuation row is required yet. */
export async function createAsset(
  householdId: string,
  userId: string,
  input: AssetCreateInput
) {
  input = assetCreateSchema.parse(input);
  const purchaseValueFils = aedToFils(input.purchaseValueAed);

  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.create({
      data: {
        householdId,
        name: input.name,
        type: input.type,
        purchaseValue: purchaseValueFils,
        purchaseDate: input.purchaseDate ? parseFormDate(input.purchaseDate) : null,
        ownership: input.ownership || null,
        notes: input.notes || null,
      },
    });

    await logAudit(
      {
        householdId,
        userId,
        action: "CREATE",
        entity: "Asset",
        entityId: asset.id,
        summary: `Added asset "${asset.name}"`,
      },
      tx
    );

    return asset;
  });
}

/**
 * Record a new estimated value for an asset. This is the mechanism for
 * updating "current value" — it always adds a new AssetValuation row rather
 * than overwriting anything, preserving the full appreciation/depreciation
 * history.
 */
export async function recordAssetValuation(
  householdId: string,
  userId: string,
  input: AssetValuationCreateInput
) {
  input = assetValuationCreateSchema.parse(input);
  const asset = await prisma.asset.findFirst({
    where: { id: input.assetId, householdId, isActive: true },
  });
  if (!asset) {
    throw new AssetValidationError("Asset not found.");
  }

  const valueFils = aedToFils(input.valueAed);

  return prisma.$transaction(async (tx) => {
    const valuation = await tx.assetValuation.create({
      data: {
        assetId: input.assetId,
        value: valueFils,
        valuationDate: parseFormDate(input.valuationDate),
        source: input.source || "estimate",
      },
    });

    await logAudit(
      {
        householdId,
        userId,
        action: "CREATE",
        entity: "AssetValuation",
        entityId: valuation.id,
        summary: `Recorded valuation of ${(valueFils / 100).toFixed(2)} ledger units for "${asset.name}"`,
      },
      tx
    );

    return valuation;
  });
}
