"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveReportAction } from "@/actions/documents";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ReportDocuments({ month, recent }: { month: string; recent: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(format: "pdf" | "docx") {
    setBusy(true); setError("");
    try {
      const result = await saveReportAction(month, format);
      if (!result.ok) return setError(result.error);
      router.refresh();
      window.location.assign(`/api/documents/${encodeURIComponent(result.filename)}`);
    } catch { setError("Could not save this report."); }
    finally { setBusy(false); }
  }
  return <Card className="p-5 sm:p-6">
    <h2 className="font-display text-xl text-ink">Save report</h2>
    <p className="mt-1 text-sm text-ink-soft">Save a snapshot on this computer and download a copy.</p>
    <div className="mt-4 flex flex-wrap gap-3">
      <Button type="button" disabled={busy} onClick={() => save("pdf")}>Save PDF</Button>
      <Button type="button" disabled={busy} onClick={() => save("docx")}>Save Word document</Button>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    <h3 className="mt-6 font-medium text-ink">Recent documents</h3>
    {recent.length === 0 ? <p className="mt-2 text-sm text-ink-soft">No reports saved yet.</p> :
      <ul className="mt-2 space-y-2">{recent.map(filename => <li key={filename}>
        <a className="text-sm text-emerald underline break-all" href={`/api/documents/${encodeURIComponent(filename)}`}>{filename}</a>
      </li>)}</ul>}
  </Card>;
}
