"use client";

import { FormEvent, useState } from "react";
import { createLead, createPublicOrganizationLead, type PublicOrganization } from "@/lib/api";
import { Button } from "@leadpilot/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@leadpilot/ui/components/ui/card";
import { Input } from "@leadpilot/ui/components/ui/input";
import { Label } from "@leadpilot/ui/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@leadpilot/ui/components/ui/select";
import { Textarea } from "@leadpilot/ui/components/ui/textarea";

type ServiceOption = {
  name: string;
  slug: string;
};

const fallbackServices: ServiceOption[] = [
  { name: "Consultation", slug: "consultation" },
  { name: "Haircut", slug: "haircut" },
  { name: "Event photography", slug: "event-photography" }
];

export function PublicBookingForm({ organization }: { organization?: PublicOrganization }) {
  const services = organization ? organization.services : fallbackServices;
  const defaultService = services[0]?.slug ?? "";
  const hasServices = services.length > 0;
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [serviceSlug, setServiceSlug] = useState(defaultService);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setStatus("loading");
    setMessage("");
    const form = new FormData(formElement);
    const input = {
      customer: {
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: String(form.get("phone") ?? "")
      },
      serviceSlug: String(form.get("serviceSlug") ?? defaultService),
      preferredDate: String(form.get("preferredDate") ?? ""),
      preferredTime: String(form.get("preferredTime") ?? ""),
      message: String(form.get("message") ?? "")
    };

    try {
      const lead = organization ? await createPublicOrganizationLead(organization.slug, input) : await createLead(input);
      setStatus("success");
      setMessage(`Request received. Lead ${lead.id} is now in the dashboard.`);
      formElement.reset();
      setServiceSlug(defaultService);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not submit request");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8">
      <div className="mx-auto max-w-3xl">
        <a href="/" className="text-sm font-medium text-accent">
          LeadPilot AI
        </a>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-3xl">{organization ? `Request ${organization.name}` : "Request a service"}</CardTitle>
            <CardDescription>Share what you need and the business owner will follow up with the best next step.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="mt-6 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required minLength={2} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="serviceSlug">Service</Label>
                  <Select name="serviceSlug" value={serviceSlug} onValueChange={setServiceSlug} disabled={!hasServices}>
                    <SelectTrigger id="serviceSlug">
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.slug} value={service.slug}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="preferredDate">Preferred date</Label>
                  <Input id="preferredDate" name="preferredDate" type="date" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="preferredTime">Preferred time</Label>
                  <Input id="preferredTime" name="preferredTime" type="time" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" name="message" required minLength={10} rows={5} />
              </div>
              {!hasServices ? <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">This business has no active services yet.</p> : null}
              <Button disabled={status === "loading" || !hasServices} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {status === "loading" ? "Submitting..." : "Submit request"}
              </Button>
            </form>
            {message ? (
              <p className={`mt-4 rounded-md px-4 py-3 text-sm ${status === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                {message}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
