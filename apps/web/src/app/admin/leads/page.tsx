import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/badge";
import { getLeads, type LeadListItem } from "@/lib/api";
import { requireCurrentUser } from "@/lib/server-auth";

export default async function LeadsPage() {
  const { user, cookieHeader } = await requireCurrentUser();
  let leads: LeadListItem[] = [];
  let error: string | null = null;
  try {
    leads = await getLeads(cookieHeader);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "API unavailable";
  }

  return (
    <AdminShell user={user}>
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-accent">Pipeline</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Leads</h1>
      </div>
      {error ? <p className="mt-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">API unavailable: {error}</p> : null}
      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <div className="grid grid-cols-[1.2fr_1fr_0.6fr_0.6fr] gap-4 border-b border-line px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
          <span>Customer</span>
          <span>Service</span>
          <span>Status</span>
          <span>Quality</span>
        </div>
        <div className="divide-y divide-line">
          {leads.map((lead) => (
            <Link
              key={lead.id}
              href={`/admin/leads/${lead.id}`}
              className="grid grid-cols-1 gap-3 px-5 py-4 hover:bg-slate-50 md:grid-cols-[1.2fr_1fr_0.6fr_0.6fr] md:items-center"
            >
              <div>
                <p className="font-medium text-ink">{lead.customer.name}</p>
                <p className="mt-1 truncate text-sm text-slate-600">{lead.messages[0]?.body}</p>
              </div>
              <p className="text-sm text-slate-700">{lead.service?.name ?? "General request"}</p>
              <Badge value={lead.status}>{lead.status}</Badge>
              <Badge value={lead.quality}>{lead.quality}</Badge>
            </Link>
          ))}
          {!leads.length ? <p className="px-5 py-8 text-sm text-slate-600">No leads have been submitted yet.</p> : null}
        </div>
      </div>
    </AdminShell>
  );
}
