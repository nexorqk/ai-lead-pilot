import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/badge";
import { getTeamMembers, type TeamMember } from "@/lib/api";
import { requireCurrentUser } from "@/lib/server-auth";
import { TeamMemberForm } from "./team-member-form";

export default async function TeamPage() {
  const { user, cookieHeader } = await requireCurrentUser();
  let members: TeamMember[] = [];
  let error: string | null = null;

  try {
    members = await getTeamMembers(cookieHeader);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "API unavailable";
  }

  const canManage = user.organization.role === "owner";

  return (
    <AdminShell user={user}>
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-accent">Organization</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Team</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">Organization access and account status.</p>
      </div>

      {error ? <p className="mt-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">API unavailable: {error}</p> : null}

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ink">Add member</h2>
            <p className="mt-1 text-sm text-slate-600">Owner permissions required.</p>
          </div>
          {!canManage ? <Badge value="viewer">read only</Badge> : null}
        </div>
        <TeamMemberForm canManage={canManage} />
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-semibold text-ink">Members</h2>
        </div>
        <div className="divide-y divide-line">
          {members.map((member) => (
            <div key={member.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_0.5fr_0.6fr] md:items-center">
              <div>
                <p className="font-medium text-ink">{member.user.name}</p>
                <p className="mt-1 text-sm text-slate-600">{member.user.email}</p>
              </div>
              <Badge value={member.role}>{member.role}</Badge>
              <p className="text-sm text-slate-600">{member.user.hasPassword ? "active login" : "invite pending"}</p>
            </div>
          ))}
          {!members.length ? <p className="px-5 py-8 text-sm text-slate-600">No team members found.</p> : null}
        </div>
      </section>
    </AdminShell>
  );
}
