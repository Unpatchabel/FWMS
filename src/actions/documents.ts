"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { saveMonthlyDocument } from "@/services/document.service";

export async function saveReportAction(month: string, format: "pdf" | "docx") {
  const user = await requireUser();
  if (format !== "pdf" && format !== "docx") return { ok: false as const, error: "Invalid format." };
  try {
    const filename = await saveMonthlyDocument(user.householdId, month, format);
    revalidatePath("/reports");
    return { ok: true as const, filename };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error && /^(Choose a valid month|PDF export cannot render)/.test(error.message) ? error.message : "Unable to save report. Check the server document directory permissions." };
  }
}
