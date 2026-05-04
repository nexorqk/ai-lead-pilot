import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/badge";
import { getLead } from "@/lib/api";
import { asArray } from "@/lib/format";
import { AnalyzeButton } from "./analyze-button";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let lead = null;
  let error: string | null = null;
  try {
    lead = await getLead(id);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "API unavailable";
  }

  return (
    <AdminShell>
      <Link href="/admin/leads" className="text-sm font-medium text-accent">
        Back to leads
      </Link>
      {error || !lead ? (
        <p className="mt-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">Could not load lead: {error}</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <section className="rounded-lg border border-line bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-ink">{lead.customer.name}</h1>
                <p className="mt-2 text-sm text-slate-600">
                  {lead.customer.email ?? "No email"} · {lead.customer.phone ?? "No phone"}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge value={lead.status}>{lead.status}</Badge>
                <Badge value={lead.quality}>{lead.quality}</Badge>
              </div>
            </div>
            <div className="mt-6 grid gap-4 rounded-md bg-slate-50 p-4 text-sm md:grid-cols-3">
              <div>
                <p className="text-slate-500">Service</p>
                <p className="mt-1 font-medium text-ink">{lead.service?.name ?? "General request"}</p>
              </div>
              <div>
                <p className="text-slate-500">Preferred date</p>
                <p className="mt-1 font-medium text-ink">{lead.preferredDate ?? "Not provided"}</p>
              </div>
              <div>
                <p className="text-slate-500">Preferred time</p>
                <p className="mt-1 font-medium text-ink">{lead.preferredTime ?? "Not provided"}</p>
              </div>
            </div>
            <div className="mt-6">
              <h2 className="font-semibold text-ink">Message</h2>
              <p className="mt-3 rounded-md border border-line bg-white p-4 leading-7 text-slate-700">{lead.messages[0]?.body}</p>
            </div>
          </section>
          <aside className="rounded-lg border border-line bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-ink">AI analysis</h2>
                <p className="mt-1 text-sm text-slate-600">Validated output stored with the lead.</p>
              </div>
              <AnalyzeButton leadId={lead.id} />
            </div>
            {lead.aiAnalyses[0] ? (
              <div className="mt-6 grid gap-5">
                <div>
                  <p className="text-sm font-medium text-slate-500">Summary</p>
                  <p className="mt-1 leading-7 text-ink">{lead.aiAnalyses[0].summary}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Next action</p>
                  <p className="mt-1 leading-7 text-ink">{lead.aiAnalyses[0].nextAction}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge value={lead.aiAnalyses[0].urgency}>{lead.aiAnalyses[0].urgency}</Badge>
                  <Badge value={lead.aiAnalyses[0].leadQuality}>{lead.aiAnalyses[0].leadQuality}</Badge>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                    {Math.round(lead.aiAnalyses[0].confidence * 100)}% confidence
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Missing fields</p>
                  <p className="mt-1 text-sm text-slate-700">{asArray(lead.aiAnalyses[0].missingFields).join(", ") || "None"}</p>
                </div>
              </div>
            ) : (
              <p className="mt-6 rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600">No analysis yet.</p>
            )}
          </aside>
        </div>
      )}
    </AdminShell>
  );
}
