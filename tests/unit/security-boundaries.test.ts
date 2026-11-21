import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { aedToFils } from "@/lib/money";
import { transactionCreateSchema } from "@/lib/validators";
import { parseLedgerTotal } from "@/lib/ledger-totals";
import { consumeLoginAttempt } from "@/lib/login-limit";
const require = createRequire(import.meta.url);
const { isTrustedIpc } = require("../../desktop/security.cjs");

describe("input and IPC boundaries", () => {
  it.each(["1,2", ",100", "1,,000", "1000,000", "1.00,00"])("rejects ambiguous money %s", value => {
    expect(() => aedToFils(value)).toThrow();
  });
  it("accepts the exact Prisma Int ceiling and rejects the next cent", () => {
    expect(aedToFils("21474836.47")).toBe(2147483647);
    expect(() => aedToFils("21474836.48")).toThrow();
    expect(aedToFils("-0.00")).toBe(0);
  });
  it("returns validation issues for malformed money rather than throwing from refinements", () => {
    expect(transactionCreateSchema.safeParse({ type: "INCOME", amountAed: "junk", accountId: "a", categoryId: "c", date: "2026-02-30" }).success).toBe(false);
  });
  it("decodes totals above Int32 exactly and fails above the safe integer range", () => {
    expect(parseLedgerTotal("4294967294")).toBe(4294967294);
    expect(() => parseLedgerTotal("9007199254740993")).toThrow();
  });
  it("bounds concurrent login attempt budgets and recovers after the window", () => {
    const now = Date.now() + 300001;
    for (let i = 0; i < 30; i++) expect(consumeLoginAttempt(now)).toBe(true);
    expect(consumeLoginAttempt(now)).toBe(false);
    expect(consumeLoginAttempt(now + 300000)).toBe(true);
  });
  it("only trusts the app main frame and exact launcher or loopback origin", () => {
    const frame = { url: "file:///app/launcher.html" };
    const contents = { mainFrame: frame };
    const window = { isDestroyed: () => false, webContents: contents };
    const event = { sender: contents, senderFrame: frame };
    const trusted = () => isTrustedIpc(event, window, "http://127.0.0.1:1234", "file:///app/launcher.html");
    expect(trusted()).toBe(true);
    frame.url = "http://127.0.0.1:1234/reports"; expect(trusted()).toBe(true);
    frame.url = "http://127.0.0.1:12345/"; expect(trusted()).toBe(false);
    frame.url = "file:///etc/passwd"; expect(trusted()).toBe(false);
    expect(isTrustedIpc({ sender: contents, senderFrame: { url: "http://127.0.0.1:1234" } }, window, "http://127.0.0.1:1234", "")).toBe(false);
  });
});
