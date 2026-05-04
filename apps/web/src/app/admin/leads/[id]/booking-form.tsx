"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@leadpilot/ui/components/ui/button";
import { Input } from "@leadpilot/ui/components/ui/input";
import { Label } from "@leadpilot/ui/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@leadpilot/ui/components/ui/select";
import { Textarea } from "@leadpilot/ui/components/ui/textarea";
import { createLeadBooking } from "@/lib/api";

export function BookingForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"requested" | "confirmed">("requested");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setError("");
    const form = new FormData(event.currentTarget);
    const localDateTime = String(form.get("startsAt") ?? "");

    try {
      await createLeadBooking(leadId, {
        startsAt: new Date(localDateTime).toISOString(),
        notes: String(form.get("notes") ?? ""),
        status
      });
      setState("idle");
      event.currentTarget.reset();
      router.refresh();
    } catch (caught) {
      setState("error");
      setError(caught instanceof Error ? caught.message : "Could not create booking");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="startsAt">Start time</Label>
        <Input id="startsAt" name="startsAt" type="datetime-local" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="bookingStatus">Status</Label>
        <Select value={status} onValueChange={(value) => setStatus(value as "requested" | "confirmed")}>
          <SelectTrigger id="bookingStatus">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="requested">Requested</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} />
      </div>
      <Button disabled={state === "loading"}>{state === "loading" ? "Creating..." : "Create booking"}</Button>
      {state === "error" ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}
