import { LogOut, Download } from "lucide-react";
import { logoutAction } from "@/actions/auth";

/**
 * Top bar. Sign-out is bound directly to the Server Action — passing a
 * "use server" function as a form's `action` needs no client JavaScript at
 * all; Next submits the form to it and follows the redirect() inside.
 * Export is a plain link to the one deliberate Route Handler in the app
 * (see src/app/api/backup/route.ts) — a browser download needs response
 * headers a Server Action can't provide.
 */
export function Topbar({ canExport }: { canExport: boolean }) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-beige-border bg-canvas/80 backdrop-blur px-4 py-4 sm:px-6">
      <div className="min-w-0">
        <p className="text-sm text-ink-soft">Welcome back</p>
        <p className="font-display text-2xl text-ink leading-tight">Owner</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {canExport && <a
          href="/api/backup"
          aria-label="Export data"
          title="Export data"
          className="inline-flex items-center gap-2 rounded-pill border border-beige-border bg-surface px-2.5 py-2 text-sm text-ink-soft hover:bg-surface-sunken transition-colors sm:px-3 sm:py-1.5"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export data</span>
        </a>}
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label="Sign out"
            title="Sign out"
            className="inline-flex items-center gap-2 rounded-pill border border-beige-border bg-surface px-2.5 py-2 text-sm text-ink-soft hover:bg-surface-sunken transition-colors sm:px-3 sm:py-1.5"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  );
}
