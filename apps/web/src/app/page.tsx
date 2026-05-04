import Link from "next/link";
import { Button } from "@leadpilot/ui/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="text-lg font-semibold text-ink">LeadPilot AI</div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/login" className="text-slate-600 hover:text-ink">
            Login
          </Link>
          <Link href="/admin" className="text-slate-600 hover:text-ink">
            Admin
          </Link>
          <Button asChild size="sm">
            <Link href="/book">Open intake</Link>
          </Button>
        </nav>
      </header>
      <section className="border-y border-line bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-accent">Lead intake, CRM, and AI follow-up</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-ink md:text-6xl">
              LeadPilot AI
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Capture service requests, classify intent and urgency, and give small-business owners the next best action from one focused dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/book">Submit a lead</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/leads">Review leads</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Today</p>
                <p className="text-2xl font-semibold text-ink">8 leads need review</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                AI ready
              </span>
            </div>
            {["Hot booking request", "Missing phone number", "Pricing question"].map((item) => (
              <div key={item} className="border-b border-line py-4 last:border-0">
                <p className="font-medium text-ink">{item}</p>
                <p className="mt-1 text-sm text-slate-600">Suggested action prepared for owner review.</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
