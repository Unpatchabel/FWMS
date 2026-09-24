"use server";
import { requireUser } from "@/lib/auth";
import { getExchangeRate } from "@/services/exchange.service";

export async function convertAction(base: string, quote: string, amount: string) {
  await requireUser();
  if (!/^(?:\d{1,9})(?:\.\d{1,4})?$/.test(amount) || Number(amount) <= 0)
    return { ok: false as const, error: "Enter a positive amount (up to four decimals)." };
  try {
    const { rate, date } = await getExchangeRate(base, quote);
    return { ok: true as const, result: Number(amount) * rate, rate, date };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Rates unavailable." };
  }
}
