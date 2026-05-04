"use client";

import { FormEvent, useState } from "react";
import { createLead } from "@/lib/api";
import { Button } from "@leadpilot/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@leadpilot/ui/components/ui/card";
import { Input } from "@leadpilot/ui/components/ui/input";
import { Label } from "@leadpilot/ui/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@leadpilot/ui/components/ui/select";
import { Textarea } from "@leadpilot/ui/components/ui/textarea";

export default function BookPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [serviceSlug, setServiceSlug] = useState("consultation");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const lead = await createLead({
        customer: {
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? "")
        },
        serviceSlug: String(form.get("serviceSlug") ?? "consultation"),
        preferredDate: String(form.get("preferredDate") ?? ""),
        preferredTime: String(form.get("preferredTime") ?? ""),
        message: String(form.get("message") ?? "")
      });
      setStatus("success");
      setMessage(`Request received. Lead ${lead.id} is now in the dashboard.`);
      event.currentTarget.reset();
      setServiceSlug("consultation");
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
            <CardTitle className="text-3xl">Request a service</CardTitle>
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
                <Select name="serviceSlug" value={serviceSlug} onValueChange={setServiceSlug}>
                  <SelectTrigger id="serviceSlug">
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="haircut">Haircut</SelectItem>
                    <SelectItem value="event-photography">Event photography</SelectItem>
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
            <Button
              disabled={status === "loading"}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
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
