"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Basic free-text search across description, category, and account name
 * (see transactions.service.listTransactionsByType). Debounced locally so
 * typing doesn't trigger a navigation on every keystroke; updates the same
 * `q` query param the server component reads.
 */
export function TransactionSearch({ initialValue }: { initialValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleChange(next: string) {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.trim()) {
        params.set("q", next.trim());
      } else {
        params.delete("q");
      }
      router.push(`${pathname}?${params.toString()}`);
    }, 300);
  }

  return (
    <div className="relative w-full sm:w-56">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-muted" />
      <Input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search description, category…"
        className="pl-9"
      />
    </div>
  );
}
