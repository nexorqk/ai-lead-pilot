"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@leadpilot/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@leadpilot/ui/components/ui/card";
import { Input } from "@leadpilot/ui/components/ui/input";
import { Label } from "@leadpilot/ui/components/ui/label";
import { updateAvailability, type AvailabilityRule } from "@/lib/api";

const days = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" }
];

type AvailabilityRow = {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

export function AvailabilityForm({ availability, canManage }: { availability: AvailabilityRule[]; canManage: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState<AvailabilityRow[]>(() =>
    days.map((day) => {
      const rule = availability.find((candidate) => candidate.dayOfWeek === day.value);
      return {
        dayOfWeek: day.value,
        enabled: Boolean(rule),
        startTime: rule?.startTime ?? "09:00",
        endTime: rule?.endTime ?? "17:00"
      };
    })
  );
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  function updateRow(dayOfWeek: number, patch: Partial<AvailabilityRow>) {
    setRows((current) => current.map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row)));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("");

    try {
      const updated = await updateAvailability({
        rules: rows
          .filter((row) => row.enabled)
          .map((row) => ({
            dayOfWeek: row.dayOfWeek,
            startTime: row.startTime,
            endTime: row.endTime
          }))
      });
      setRows((current) =>
        current.map((row) => {
          const rule = updated.find((candidate) => candidate.dayOfWeek === row.dayOfWeek);
          return {
            ...row,
            enabled: Boolean(rule),
            startTime: rule?.startTime ?? row.startTime,
            endTime: rule?.endTime ?? row.endTime
          };
        })
      );
      setState("success");
      setMessage("Availability saved.");
      router.refresh();
    } catch (caught) {
      setState("error");
      setMessage(caught instanceof Error ? caught.message : "Could not update availability");
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <Card className="rounded-lg border-line bg-white">
        <CardHeader>
          <CardTitle className="text-xl">Booking availability</CardTitle>
          <CardDescription>Active days define when new bookings can be scheduled.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3">
            {days.map((day) => {
              const row = rows.find((candidate) => candidate.dayOfWeek === day.value);
              if (!row) return null;
              return (
                <div key={day.value} className="grid gap-3 rounded-lg border border-line bg-slate-50 p-4 md:grid-cols-[180px_1fr] md:items-center">
                  <label className="flex items-center gap-3 text-sm font-medium text-ink">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(event) => updateRow(day.value, { enabled: event.target.checked })}
                      disabled={!canManage}
                      className="h-4 w-4 rounded border-line"
                    />
                    {day.label}
                  </label>
                  <div className="grid grid-cols-2 gap-3 md:max-w-xs">
                    <div className="grid gap-1.5">
                      <Label htmlFor={`availability-start-${day.value}`}>Start</Label>
                      <Input
                        id={`availability-start-${day.value}`}
                        type="time"
                        value={row.startTime}
                        onChange={(event) => updateRow(day.value, { startTime: event.target.value })}
                        disabled={!canManage || !row.enabled}
                        required={row.enabled}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor={`availability-end-${day.value}`}>End</Label>
                      <Input
                        id={`availability-end-${day.value}`}
                        type="time"
                        value={row.endTime}
                        onChange={(event) => updateRow(day.value, { endTime: event.target.value })}
                        disabled={!canManage || !row.enabled}
                        required={row.enabled}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={!canManage || state === "loading"}>{state === "loading" ? "Saving..." : "Save availability"}</Button>
            {!canManage ? <p className="text-sm text-slate-600">Owner permissions required.</p> : null}
          </div>
          {message ? (
            <p className={`rounded-md px-4 py-3 text-sm ${state === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
              {message}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </form>
  );
}
