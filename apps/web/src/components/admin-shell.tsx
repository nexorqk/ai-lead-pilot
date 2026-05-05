import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@leadpilot/ui/components/ui/button";
import type { CurrentUser } from "@/lib/api";
import { LogoutButton } from "./logout-button";

export function AdminShell({ children, user }: { children: ReactNode; user: CurrentUser }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white px-5 py-6 md:block">
        <Link href="/" className="text-lg font-semibold tracking-tight text-ink">
          LeadPilot AI
        </Link>
        <div className="mt-5 rounded-md border border-line bg-slate-50 p-3">
          <p className="truncate text-sm font-medium text-ink">{user.organization.name}</p>
          <p className="mt-1 truncate text-xs text-slate-500">
            {user.name} · {user.organization.role}
          </p>
        </div>
        <nav className="mt-8 grid gap-2 text-sm">
          <Button asChild variant="ghost" className="justify-start text-slate-700">
            <Link href="/admin">Dashboard</Link>
          </Button>
          <Button asChild variant="ghost" className="justify-start text-slate-700">
            <Link href="/admin/leads">Leads</Link>
          </Button>
          <Button asChild variant="ghost" className="justify-start text-slate-700">
            <Link href="/admin/bookings">Bookings</Link>
          </Button>
          <Button asChild variant="ghost" className="justify-start text-slate-700">
            <Link href="/admin/notifications">Notifications</Link>
          </Button>
          <Button asChild variant="ghost" className="justify-start text-slate-700">
            <Link href="/admin/team">Team</Link>
          </Button>
          <Button asChild variant="ghost" className="justify-start text-slate-700">
            <Link href="/book">Public form</Link>
          </Button>
        </nav>
        <div className="absolute bottom-6 left-5 right-5">
          <LogoutButton />
        </div>
      </aside>
      <main className="md:pl-64">
        <div className="mx-auto max-w-6xl px-5 py-6 md:px-8">{children}</div>
      </main>
    </div>
  );
}
