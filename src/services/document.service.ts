import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { deflateRawSync } from "node:zlib";
import { randomBytes } from "node:crypto";
import { getMonthlyReport } from "@/services/reports.service";
import { getHouseholdCurrency } from "@/services/currency.service";
import { formatAED } from "@/lib/money";

// Files live on the host running FWMS, never in the public/ folder or Git.
export const documentsDirectory = () => process.env.FWMS_DOCUMENTS_DIR || join(homedir(), "Documents", "FWMS-Recent-Docs");
const filenamePattern = /^fwms-report-\d{4}-(?:0[1-9]|1[0-2])-\d{8}T\d{6}Z-[a-f0-9]{6}\.(?:pdf|docx)$/;

const escapeXml = (text: string) => text.replace(/[<>&"']/g, char => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!);

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Minimal ZIP container for a standards-based editable .docx, with no remote dependency. */
function zip(entries: { name: string; data: string }[]): Buffer {
  const local: Buffer[] = [], central: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name), data = deflateRawSync(Buffer.from(entry.data));
    const raw = Buffer.from(entry.data), checksum = crc32(raw);
    const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4);
    header.writeUInt16LE(8, 8); header.writeUInt32LE(checksum, 14);
    header.writeUInt32LE(data.length, 18); header.writeUInt32LE(raw.length, 22); header.writeUInt16LE(name.length, 26);
    local.push(header, name, data);
    const index = Buffer.alloc(46); index.writeUInt32LE(0x02014b50, 0); index.writeUInt16LE(20, 4);
    index.writeUInt16LE(20, 6); index.writeUInt16LE(8, 10); index.writeUInt32LE(checksum, 16);
    index.writeUInt32LE(data.length, 20); index.writeUInt32LE(raw.length, 24);
    index.writeUInt16LE(name.length, 28); index.writeUInt32LE(offset, 42);
    central.push(index, name); offset += header.length + name.length + data.length;
  }
  const indexBytes = Buffer.concat(central);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(indexBytes.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, indexBytes, end]);
}

function toDocx(lines: string[]): Buffer {
  const body = lines.map((line, i) => `<w:p><w:pPr><w:spacing w:after="${i === 0 ? 280 : 140}"/></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`).join("");
  return zip([
    { name: "[Content_Types].xml", data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>' },
    { name: "_rels/.rels", data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
    { name: "word/document.xml", data: `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000"/></w:sectPr></w:body></w:document>` },
  ]);
}

function toPdf(lines: string[]): Buffer {
  // The bundled PDF font is ASCII-only. Never silently replace financial labels.
  if (lines.some(line => /[^\x20-\x7e]/.test(line))) {
    throw new Error("PDF export cannot render non-English characters in category names. Save the Word document instead.");
  }
  const safe = (s: string) => s.replace(/[\\()]/g, "\\$&");
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += 48) pages.push(lines.slice(i, i + 48));
  const objects: string[] = ["", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  const pageRefs: string[] = [];
  for (const page of pages) {
    const content = `BT /F1 11 Tf 50 780 Td 16 TL ${page.map(line => `(${safe(line)}) Tj T*`).join(" ")} ET`;
    const stream = Buffer.byteLength(content, "latin1");
    const contentId = objects.push(`<< /Length ${stream} >>\nstream\n${content}\nendstream`);
    const pageId = objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageRefs.push(`${pageId} 0 R`);
  }
  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Count ${pages.length} /Kids [${pageRefs.join(" ")}] >>`;
  let data = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, idx) => { offsets.push(Buffer.byteLength(data, "latin1")); data += `${idx + 1} 0 obj\n${obj}\nendobj\n`; });
  const xref = Buffer.byteLength(data, "latin1");
  data += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) data += `${String(offset).padStart(10, "0")} 00000 n \n`;
  data += `trailer\n<< /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(data, "latin1");
}

export async function saveMonthlyDocument(householdId: string, month: string, format: "pdf" | "docx") {
  if (!/^(19|20)\d{2}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Choose a valid month.");
  const [year, number] = month.split("-").map(Number);
  const [report, currency] = await Promise.all([getMonthlyReport(householdId, new Date(year, number - 1, 1)), getHouseholdCurrency(householdId)]);
  const money = (amount: number) => formatAED(amount, { currency });
  const lines = [ `FWMS monthly report - ${month}`, "", `Ledger currency: ${currency}`,
    `Income: ${money(report.incomeFils)}`, `Spending: ${money(report.spendingFils)}`,
    `Income after spending: ${money(report.remainingFils)}`,
    `Savings rate: ${report.savingsRatePct === null ? "N/A" : report.savingsRatePct + "%"}`,
    `Loan principal repaid: ${money(report.principalPaidFils)}`, `Total cash paid: ${money(report.cashPaidFils)}`,
    "", "Spending by category", ...report.spendingCategories.map(row => `${row.name}: ${money(row.amountFils)}`),
    "", "Income by source", ...report.incomeCategories.map(row => `${row.name}: ${money(row.amountFils)}`),
    "", `Generated: ${new Date().toISOString()}`,
  ];
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const filename = `fwms-report-${month}-${timestamp}-${randomBytes(3).toString("hex")}.${format}`;
  await mkdir(documentsDirectory(), { recursive: true, mode: 0o700 });
  await writeFile(join(documentsDirectory(), filename), format === "pdf" ? toPdf(lines) : toDocx(lines), { flag: "wx", mode: 0o600 });
  return filename;
}

export async function recentDocuments() {
  try {
    const names = (await readdir(documentsDirectory())).filter(name => filenamePattern.test(name));
    return names.sort().reverse().slice(0, 20);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function readDocument(filename: string) {
  if (!filenamePattern.test(filename)) throw new Error("Invalid document name.");
  return readFile(join(documentsDirectory(), filename));
}
