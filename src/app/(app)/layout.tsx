import { requireUser, isOwner } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CurrencyProvider } from "@/components/currency-context";
import { getHouseholdCurrency } from "@/services/currency.service";
/**
 * Layout for every authenticated page. `requireUser` runs server-side and
 * redirects to /login if there is no valid session — a second line of defence
 * behind the edge middleware.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const currency = await getHouseholdCurrency(user.householdId);

  return (
    <CurrencyProvider currency={currency}>
    <div className="flex h-dvh overflow-hidden md:h-auto md:min-h-screen md:overflow-visible">
      <Sidebar />
      <MobileNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <Topbar canExport={isOwner(user)} username={user.name} />
        <main className="min-h-0 flex-1 overflow-y-auto p-6 md:overflow-visible md:pb-8 lg:p-8">
          {children}
        </main>
      </div>
    </div>
    </CurrencyProvider>
  );
}
