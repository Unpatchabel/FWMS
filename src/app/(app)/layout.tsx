import { requireUser, isOwner } from "@/lib/auth";
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
    <div className="flex h-dvh overflow-hidden md:h-auto md:min-h-screen md:overflow-visible">
      <Sidebar />
      <MobileNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <Topbar userName={user.name} canExport={isOwner(user)} />
        <main className="min-h-0 flex-1 overflow-y-auto p-6 md:overflow-visible md:pb-8 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
