"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  Wallet,
  Building2,
  Landmark,
  PieChart,
  Users,
  Target,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Navigation config. `ready` flags which sections are built.
 * Upcoming phases render as quiet, non-clickable rows with a "Soon" marker,
 * so the full product map is visible without any broken links.
 */
type NavItem = { label: string; href: string; icon: LucideIcon; ready: boolean };

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, ready: true },
  { label: "Income", href: "/income", icon: TrendingUp, ready: true },
  { label: "Expenses", href: "/expenses", icon: Receipt, ready: true },
  { label: "Accounts", href: "/accounts", icon: Wallet, ready: true },
  { label: "Assets", href: "/assets", icon: Building2, ready: true },
  { label: "Loans", href: "/loans", icon: Landmark, ready: true },
  { label: "Reports", href: "/reports", icon: PieChart, ready: true },
  { label: "Family", href: "/family", icon: Users, ready: true },
  { label: "Goals", href: "/goals", icon: Target, ready: false },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-ink-brand text-beige">
      <div className="px-6 py-6">
        <p className="font-display text-xl tracking-wide">FWMS</p>
        <p className="text-beige/50 text-xs mt-0.5">Family Wealth</p>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          if (!item.ready) {
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-beige/40 cursor-default"
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                <span className="ml-auto text-[10px] uppercase tracking-wide text-beige/30">
                  Soon
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-beige/15 text-beige font-medium"
                  : "text-beige/70 hover:bg-beige/10 hover:text-beige"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <p className="px-6 py-4 text-[11px] text-beige/40">
        Private &middot; Self-hosted
      </p>
    </aside>
  );
}
