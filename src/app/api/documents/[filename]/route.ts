import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { readDocument } from "@/services/document.service";

export const runtime = "nodejs";
export async function GET(_request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  if (!await getCurrentUser()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { filename } = await params;
  try {
    const data = await readDocument(filename);
    return new NextResponse(new Uint8Array(data), { headers: {
      "Content-Type": filename.endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
}
