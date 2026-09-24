import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { saveMonthlyDocument, recentDocuments, readDocument } from "@/services/document.service";
import { createTestHousehold } from "../setup/helpers";

describe("private report snapshots", () => {
  it("saves readable PDF and editable DOCX archives and blocks arbitrary files", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fwms-docs-"));
    const old = process.env.FWMS_DOCUMENTS_DIR;
    process.env.FWMS_DOCUMENTS_DIR = directory;
    try {
      const { household } = await createTestHousehold();
      const pdfName = await saveMonthlyDocument(household.id, "2026-08", "pdf");
      const docName = await saveMonthlyDocument(household.id, "2026-08", "docx");
      const pdf = await readFile(join(directory, pdfName));
      const docx = await readFile(join(directory, docName));
      expect(pdf.subarray(0, 8).toString()).toBe("%PDF-1.4");
      expect(pdf.toString("latin1")).toContain("Ledger currency: AED");
      expect(docx.subarray(0, 4).toString("binary")).toBe("PK\x03\x04");
      expect(await recentDocuments()).toEqual(expect.arrayContaining([pdfName, docName]));
      await expect(readDocument("../dev.db")).rejects.toThrow("Invalid document name");
      await expect(saveMonthlyDocument(household.id, "2026-13", "pdf")).rejects.toThrow("valid month");
    } finally {
      if (old === undefined) delete process.env.FWMS_DOCUMENTS_DIR;
      else process.env.FWMS_DOCUMENTS_DIR = old;
      await rm(directory, { recursive: true, force: true });
    }
  });
});
