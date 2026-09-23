import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
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

  return (
  <div className="flex min-h-screen">
    <Sidebar />
    <MobileNav />
    <div className="flex min-w-0 flex-1 flex-col">
      <Topbar userName={user.name} />
      <main className="flex-1 p-6 pb-24 md:pb-8 lg:p-8">
        {children}
      </main>
    </div>
  </div>
);
}
