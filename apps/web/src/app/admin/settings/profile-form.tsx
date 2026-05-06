"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@leadpilot/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@leadpilot/ui/components/ui/card";
import { Input } from "@leadpilot/ui/components/ui/input";
import { Label } from "@leadpilot/ui/components/ui/label";
import { Textarea } from "@leadpilot/ui/components/ui/textarea";
import { updateOrganizationProfile, type OrganizationProfile } from "@/lib/api";

type ServiceRow = OrganizationProfile["services"][number] & { active: boolean };

export function OrganizationProfileForm({ profile, canManage }: { profile: OrganizationProfile; canManage: boolean }) {
  const router = useRouter();
  const [services, setServices] = useState<ServiceRow[]>(profile.services);
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  function updateService(index: number, field: keyof ServiceRow, value: string | number | boolean) {
    setServices((current) => current.map((service, serviceIndex) => (serviceIndex === index ? { ...service, [field]: value } : service)));
  }

  function addService() {
    setServices((current) => [
      ...current,
      {
        id: "",
        name: "",
        slug: "",
        description: "",
        durationMin: 60,
        active: true
      }
    ]);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("");

    const form = new FormData(event.currentTarget);
    try {
      const updated = await updateOrganizationProfile({
        name: String(form.get("name") ?? ""),
        slug: String(form.get("slug") ?? ""),
        timezone: String(form.get("timezone") ?? ""),
        services: services.map((service) => ({
          id: service.id || undefined,
          name: service.name,
          slug: service.slug,
          description: service.description ?? "",
          durationMin: service.durationMin,
          active: service.active
        }))
      });
      setServices(updated.services);
      setState("success");
      setMessage(`Public page updated at /${updated.slug}/book.`);
      router.refresh();
    } catch (caught) {
      setState("error");
      setMessage(caught instanceof Error ? caught.message : "Could not update organization profile");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <Card className="rounded-lg border-line bg-white">
        <CardHeader>
          <CardTitle className="text-xl">Public profile</CardTitle>
          <CardDescription>These details are used by the public intake page.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="organizationName">Business name</Label>
              <Input id="organizationName" name="name" defaultValue={profile.name} minLength={2} maxLength={120} disabled={!canManage} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="organizationSlug">Public slug</Label>
              <Input
                id="organizationSlug"
                name="slug"
                defaultValue={profile.slug}
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                maxLength={80}
                disabled={!canManage}
                required
              />
            </div>
          </div>
          <div className="grid gap-1.5 md:max-w-sm">
            <Label htmlFor="organizationTimezone">Timezone</Label>
            <Input id="organizationTimezone" name="timezone" defaultValue={profile.timezone} maxLength={80} disabled={!canManage} required />
          </div>
          <Button asChild variant="outline" className="w-fit">
            <Link href={`/${profile.slug}/book`}>Open public page</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-lg border-line bg-white">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-xl">Public services</CardTitle>
            <CardDescription>Active services appear as customer choices on the intake form.</CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={addService} disabled={!canManage || services.length >= 12}>
            Add service
          </Button>
        </CardHeader>
        <CardContent className="grid gap-5">
          {services.map((service, index) => (
            <div key={service.id || index} className="grid gap-4 rounded-lg border border-line bg-slate-50 p-4">
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_140px]">
                <div className="grid gap-1.5">
                  <Label htmlFor={`serviceName-${index}`}>Name</Label>
                  <Input
                    id={`serviceName-${index}`}
                    value={service.name}
                    onChange={(event) => updateService(index, "name", event.target.value)}
                    minLength={2}
                    maxLength={120}
                    disabled={!canManage}
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`serviceSlug-${index}`}>Slug</Label>
                  <Input
                    id={`serviceSlug-${index}`}
                    value={service.slug}
                    onChange={(event) => updateService(index, "slug", event.target.value)}
                    pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                    maxLength={80}
                    disabled={!canManage}
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`serviceDuration-${index}`}>Minutes</Label>
                  <Input
                    id={`serviceDuration-${index}`}
                    type="number"
                    value={service.durationMin}
                    onChange={(event) => updateService(index, "durationMin", Number(event.target.value))}
                    min={15}
                    max={480}
                    disabled={!canManage}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`serviceDescription-${index}`}>Description</Label>
                <Textarea
                  id={`serviceDescription-${index}`}
                  value={service.description ?? ""}
                  onChange={(event) => updateService(index, "description", event.target.value)}
                  maxLength={500}
                  disabled={!canManage}
                />
              </div>
              <label className="flex w-fit items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={service.active}
                  onChange={(event) => updateService(index, "active", event.target.checked)}
                  disabled={!canManage}
                  className="h-4 w-4 rounded border-line"
                />
                Active on public page
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!canManage || state === "loading"}>{state === "loading" ? "Saving..." : "Save settings"}</Button>
        {!canManage ? <p className="text-sm text-slate-600">Owner permissions required.</p> : null}
      </div>
      {message ? (
        <p className={`rounded-md px-4 py-3 text-sm ${state === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
