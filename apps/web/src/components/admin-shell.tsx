import Link from "next/link";
import type { ReactNode } from "react";

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white px-5 py-6 md:block">
        <Link href="/" className="text-lg font-semibold tracking-tight text-ink">
          LeadPilot AI
        </Link>
        <nav className="mt-8 grid gap-2 text-sm">
          <Link href="/admin" className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100">
            Dashboard
          </Link>
          <Link href="/admin/leads" className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100">
            Leads
          </Link>
          <Link href="/book" className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100">
            Public form
          </Link>
        </nav>
      </aside>
      <main className="md:pl-64">
        <div className="mx-auto max-w-6xl px-5 py-6 md:px-8">{children}</div>
      </main>
    </div>
  );
}
