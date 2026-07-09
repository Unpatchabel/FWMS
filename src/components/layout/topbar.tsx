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
export function Topbar({ userName }: { userName: string }) {
  const firstName = userName.split(" ")[0];

  return (
    <header className="flex items-center justify-between border-b border-beige-border bg-canvas/80 backdrop-blur px-6 py-4">
      <div>
        <p className="text-sm text-ink-soft">Welcome back,</p>
        <p className="font-display text-lg text-ink leading-tight">{firstName}</p>
      </div>

      <div className="flex items-center gap-2">
        <a
          href="/api/backup"
          className="inline-flex items-center gap-2 rounded-pill border border-beige-border bg-surface px-3 py-1.5 text-sm text-ink-soft hover:bg-surface-sunken transition-colors"
        >
          <Download className="h-4 w-4" />
          Export data
        </a>
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-pill border border-beige-border bg-surface px-3 py-1.5 text-sm text-ink-soft hover:bg-surface-sunken transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
