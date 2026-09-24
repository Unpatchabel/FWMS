"use client";
import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { convertAction } from "@/actions/tools";
import type { ExchangeCurrency } from "@/services/exchange.service";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function CurrencyPicker({ label, code, currencies, onSelect }: {
  label: string; code: string; currencies: ExchangeCurrency[]; onSelect: (code: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const selected = currencies.find(item => item.code === code);
  const matches = currencies.filter(item =>
    `${item.code} ${item.name}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  );
  function choose(item: ExchangeCurrency) {
    onSelect(item.code);
    setQuery(""); setOpen(false); setActive(0);
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { setOpen(false); setQuery(""); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) { setOpen(true); setQuery(""); setActive(0); return; }
      setActive(index => Math.max(0, Math.min(matches.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))));
    }
    if (event.key === "Enter" && open) {
      event.preventDefault();
      if (matches[active]) choose(matches[active]);
    }
  }
  return <div className="relative min-w-0" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setOpen(false); setQuery(""); }
  }}>
    <label htmlFor={id} className="block text-sm text-ink-soft">{label}</label>
    <input id={id} type="text" role="combobox" autoComplete="off"
      aria-expanded={open} aria-controls={`${id}-options`}
      aria-activedescendant={open && matches[active] ? `${id}-${matches[active].code}` : undefined}
      aria-autocomplete="list" placeholder="Search currency or code"
      className="mt-1 w-full rounded-lg border border-beige-border bg-surface p-2 text-ink"
      value={open ? query : selected ? `${selected.name} (${selected.code})` : code}
      onFocus={() => { setOpen(true); setQuery(""); setActive(0); }}
      onClick={() => { if (!open) { setOpen(true); setQuery(""); setActive(0); } }}
      onChange={event => { setQuery(event.target.value); setOpen(true); setActive(0); }}
      onKeyDown={keyDown} />
    {open && <div id={`${id}-options`} role="listbox" aria-label={`${label} currency`}
      className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-beige-border bg-surface shadow-card">
      {matches.length === 0 ? <p className="p-3 text-sm text-ink-soft">No matching currency.</p> :
        matches.map((item, index) => <button key={item.code} id={`${id}-${item.code}`}
          type="button" role="option" aria-selected={item.code === code}
          className={`block w-full px-3 py-2 text-left text-sm text-ink hover:bg-surface-sunken ${index === active ? "bg-emerald-soft" : ""}`}
          onPointerDown={event => event.preventDefault()}
          onMouseEnter={() => setActive(index)} onClick={() => choose(item)}>
          {item.name} <span className="text-ink-soft">({item.code})</span>
        </button>)}
    </div>}
  </div>;
}

export function ToolsPanel({ currency, currencies }: { currency: string; currencies: ExchangeCurrency[] }) {
  const [base, setBase] = useState(currency);
  const [quote, setQuote] = useState(currency === "USD" ? "EUR" : "USD");
  const available = [currency, quote].reduce<ExchangeCurrency[]>((items, code) =>
    items.some(item => item.code === code) ? items : [...items, { code, name: new Intl.DisplayNames("en", { type: "currency" }).of(code) ?? code }], currencies);
  const [amount, setAmount] = useState("1");
  const [result, setResult] = useState<{ value: number; rate: number; date: string | null } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [operator, setOperator] = useState("+");
  const [answer, setAnswer] = useState<string | null>(null);
  async function convert(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setResult(null);
    try {
      const response = await convertAction(base, quote, amount);
      if (response.ok) setResult({ value: response.result, rate: response.rate, date: response.date });
      else setError(response.error);
    } catch { setError("Rates unavailable. Check your connection and try again."); }
    finally { setBusy(false); }
  }
  function calculate(event: FormEvent) {
    event.preventDefault();
    const a = Number(first), b = Number(second);
    if (!first.trim() || !second.trim() || !Number.isFinite(a) || !Number.isFinite(b)) return setAnswer("Enter two valid numbers.");
    if (operator === "/" && b === 0) return setAnswer("Cannot divide by zero.");
    const value = operator === "+" ? a + b : operator === "−" ? a - b : operator === "×" ? a * b : a / b;
    setAnswer(Number.isFinite(value) ? String(Number(value.toPrecision(12))) : "Result is too large.");
  }
  return <div className="grid gap-5 lg:grid-cols-2">
    <Card className="p-5 sm:p-6"><h2 className="font-display text-xl text-ink">Convert</h2>
      <p className="mt-1 text-sm text-ink-soft">Latest available reference rate; see the rate date below.</p>
      <form onSubmit={convert} className="mt-5 space-y-4">
        <label className="block text-sm text-ink-soft">Amount
          <Input className="mt-1" inputMode="decimal" required value={amount} onChange={e => setAmount(e.target.value)} /></label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CurrencyPicker label="From" code={base} currencies={available} onSelect={code => { setBase(code); setResult(null); }} />
          <CurrencyPicker label="To" code={quote} currencies={available} onSelect={code => { setQuote(code); setResult(null); }} />
        </div>
        <Button type="submit" disabled={busy}>{busy ? "Getting rate…" : "Convert"}</Button>
      </form>
      {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
      {result && <div className="mt-5 rounded-lg bg-surface-sunken p-4 text-ink" aria-live="polite">
        <p className="text-xl font-medium tabular">{new Intl.NumberFormat("en", { maximumFractionDigits: 4 }).format(result.value)} {available.find(item => item.code === quote)?.name ?? quote} ({quote})</p>
        <p className="mt-2 text-xs text-ink-soft">{result.date ? `1 ${base} = ${result.rate} ${quote} · Reference rate dated ${result.date} · Frankfurter` : "Same currency; no exchange rate needed."}</p>
      </div>}
    </Card>
    <Card className="p-5 sm:p-6"><h2 className="font-display text-xl text-ink">Calculator</h2>
      <form className="mt-5 space-y-4" onSubmit={calculate}>
        <label className="block text-sm text-ink-soft">First number<Input className="mt-1" type="number" step="any" required value={first} onChange={e => setFirst(e.target.value)} /></label>
        <label className="block text-sm text-ink-soft">Operation
          <select className="mt-1 w-full rounded-lg border border-beige-border bg-surface p-2 text-ink" value={operator} onChange={e => setOperator(e.target.value)}>
            {["+", "−", "×", "/"].map(op => <option key={op} value={op}>{op}</option>)}
          </select></label>
        <label className="block text-sm text-ink-soft">Second number<Input className="mt-1" type="number" step="any" required value={second} onChange={e => setSecond(e.target.value)} /></label>
        <Button type="submit">Calculate</Button>
      </form>
      {answer !== null && <p className="mt-5 text-xl tabular text-ink" aria-live="polite">{answer}</p>}
    </Card>
  </div>;
}
