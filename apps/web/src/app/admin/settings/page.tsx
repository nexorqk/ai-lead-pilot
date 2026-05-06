import { AdminShell } from "@/components/admin-shell";
import { getAvailability, getOrganizationProfile, type AvailabilityRule, type OrganizationProfile } from "@/lib/api";
import { requireCurrentUser } from "@/lib/server-auth";
import { AvailabilityForm } from "./availability-form";
import { OrganizationProfileForm } from "./profile-form";

export default async function SettingsPage() {
  const { user, cookieHeader } = await requireCurrentUser();
  let profile: OrganizationProfile | null = null;
  let availability: AvailabilityRule[] = [];
  let error: string | null = null;

  try {
    [profile, availability] = await Promise.all([getOrganizationProfile(cookieHeader), getAvailability(cookieHeader)]);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "API unavailable";
  }

  const canManage = user.organization.role === "owner";

  return (
    <AdminShell user={user}>
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-accent">Organization</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Public intake profile and service options for the organization booking page.
        </p>
      </div>

      {error ? <p className="mt-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">API unavailable: {error}</p> : null}

      {profile ? (
        <div className="mt-6 grid gap-6">
          <OrganizationProfileForm profile={profile} canManage={canManage} />
          <AvailabilityForm availability={availability} canManage={canManage} />
        </div>
      ) : (
        <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">Organization settings could not be loaded.</p>
        </section>
      )}
    </AdminShell>
  );
}
