import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { exportHouseholdData } from "@/services/backup.service";

/**
 * GET /api/backup — downloads a complete JSON export of the signed-in user's
 * household data.
 *
 * This is the one deliberate exception to "every mutation is a Server
 * Action": it's a READ, not a write, and Server Actions have no way to
 * return a response with a Content-Disposition header to trigger a browser
 * file download. A Route Handler is the correct tool for that, not a
 * workaround — so it stays, without reopening the mutation-path question
 * settled earlier.
 *
 * Auth is checked here AND by the edge middleware (this path isn't exempted
 * from it), matching the defense-in-depth pattern used everywhere else.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const data = await exportHouseholdData(user.householdId);
  const json = JSON.stringify(data, null, 2);
  const filename = `fwms-backup-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
