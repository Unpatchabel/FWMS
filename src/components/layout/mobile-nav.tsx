"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, TrendingUp, Receipt, Wallet,
  Building2, Landmark, PieChart, Users, Menu, X,
} from "lucide-react";

const mainLinks = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Income", href: "/income", icon: TrendingUp },
  { label: "Expenses", href: "/expenses", icon: Receipt },
  { label: "Accounts", href: "/accounts", icon: Wallet },
];

const otherLinks = [
  { label: "Assets", href: "/assets", icon: Building2 },
  { label: "Loans", href: "/loans", icon: Landmark },
  { label: "Reports", href: "/reports", icon: PieChart },
  { label: "Family", href: "/family", icon: Users },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const otherActive = otherLinks.some((item) => item.href === pathname);

  return (
    <>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-ink/40 md:hidden"
            onClick={() => setOpen(false)}
          />
          <section
            aria-label="More sections"
            className="fixed inset-x-4 bottom-20 z-50 rounded-card bg-surface p-3 shadow-card md:hidden"
          >
            <div className="flex items-center justify-between px-2 py-2">
              <h2 className="font-display text-lg text-ink">More sections</h2>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-ink-soft"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {otherLinks.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-ink hover:bg-surface-sunken"
              >
                <Icon className="h-5 w-5 text-emerald" />
                {label}
              </Link>
            ))}
          </section>
        </>
      )}

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-beige-border bg-surface px-2 pb-2 pt-2 shadow-card md:hidden"
      >
        {mainLinks.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] ${
                active ? "bg-emerald-soft font-medium text-emerald" : "text-ink-soft"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] ${
            otherActive || open ? "bg-emerald-soft font-medium text-emerald" : "text-ink-soft"
          }`}
        >
          <Menu className="h-5 w-5" />
          More
        </button>
      </nav>
    </>
  );
}
