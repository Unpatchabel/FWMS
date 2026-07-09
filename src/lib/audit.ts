import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Writes one AuditLog row. Called from services after a successful write, so
 * every financial mutation has a "who did what, when" trail.
 *
 * `db` defaults to the top-level Prisma client but callers inside an active
 * `prisma.$transaction(async (tx) => ...)` block should pass `tx` here, so
 * the audit row commits or rolls back atomically together with the write it
 * describes. (Passing the outer client from inside a transaction would let
 * the audit row persist even if the surrounding write rolled back — this
 * parameter exists specifically to avoid that.)
 */
export async function logAudit(
  params: {
    householdId: string;
    userId?: string | null;
    action: "CREATE" | "UPDATE" | "DELETE" | "VOID";
    entity: string;
    entityId: string;
    summary?: string;
  },
  db: Prisma.TransactionClient = prisma
) {
  await db.auditLog.create({
    data: {
      householdId: params.householdId,
      userId: params.userId ?? undefined,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      summary: params.summary,
    },
  });
}
