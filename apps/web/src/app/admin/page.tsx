import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { getDashboardSummary, getLeads, type LeadListItem, type DashboardSummary } from "@/lib/api";
import { Badge } from "@/components/badge";
import { Button } from "@leadpilot/ui/components/ui/button";

export default async function AdminPage() {
  let summary: DashboardSummary | undefined;
  let leads: LeadListItem[] = [];
  let error: string | null = null;
  try {
    [summary, leads] = await Promise.all([getDashboardSummary(), getLeads()]);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "API unavailable";
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-accent">Admin dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Lead command center</h1>
        </div>
        <Button asChild>
          <Link href="/admin/leads">View all leads</Link>
        </Button>
      </div>
      {error ? <p className="mt-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">API unavailable: {error}</p> : null}
      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          ["Total", summary?.totalLeads ?? 0],
          ["New", summary?.newLeads ?? 0],
          ["Qualified", summary?.qualifiedLeads ?? 0],
          ["Booked", summary?.bookedLeads ?? 0]
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
          </div>
        ))}
      </section>
      <section className="mt-6 rounded-lg border border-line bg-white shadow-sm">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-semibold text-ink">Recent leads</h2>
        </div>
        <div className="divide-y divide-line">
          {leads.slice(0, 5).map((lead) => (
            <Link key={lead.id} href={`/admin/leads/${lead.id}`} className="block px-5 py-4 hover:bg-slate-50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{lead.customer.name}</p>
                  <p className="mt-1 max-w-2xl truncate text-sm text-slate-600">{lead.messages[0]?.body}</p>
                </div>
                <div className="flex gap-2">
                  <Badge value={lead.status}>{lead.status}</Badge>
                  <Badge value={lead.quality}>{lead.quality}</Badge>
                </div>
              </div>
            </Link>
          ))}
          {!leads.length ? <p className="px-5 py-8 text-sm text-slate-600">No leads yet.</p> : null}
        </div>
      </section>
    </AdminShell>
  );
}
