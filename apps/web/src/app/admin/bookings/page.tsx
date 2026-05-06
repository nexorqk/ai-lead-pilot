import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/badge";
import { getAvailability, getBookings, type AvailabilityRule, type Booking } from "@/lib/api";
import { requireCurrentUser } from "@/lib/server-auth";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function BookingsPage() {
  const { user, cookieHeader } = await requireCurrentUser();
  let bookings: Booking[] = [];
  let availability: AvailabilityRule[] = [];
  let error: string | null = null;

  try {
    [bookings, availability] = await Promise.all([getBookings(cookieHeader), getAvailability(cookieHeader)]);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "API unavailable";
  }

  const weekDays = getNextSevenDays();

  return (
    <AdminShell user={user}>
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-accent">Calendar</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Bookings</h1>
      </div>
      {error ? <p className="mt-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">API unavailable: {error}</p> : null}

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ink">Week calendar</h2>
            <p className="mt-1 text-sm text-slate-600">Next 7 days in UTC.</p>
          </div>
          <Link href="/admin/settings" className="text-sm font-medium text-accent">
            Edit availability
          </Link>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-7">
          {weekDays.map((day) => {
            const dayBookings = bookings.filter((booking) => toDateKey(new Date(booking.startsAt)) === day.key);
            const dayAvailability = availability.filter((rule) => rule.dayOfWeek === day.dayOfWeek);
            return (
              <div key={day.key} className="min-h-48 rounded-lg border border-line bg-slate-50 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">{dayNames[day.dayOfWeek]}</p>
                    <p className="text-xs text-slate-500">{day.label}</p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 ring-1 ring-line">{dayBookings.length}</span>
                </div>
                <div className="mt-3 grid gap-1.5">
                  {dayAvailability.map((rule) => (
                    <span key={rule.id} className="rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-800 ring-1 ring-emerald-100">
                      {rule.startTime}-{rule.endTime}
                    </span>
                  ))}
                  {!dayAvailability.length ? <span className="text-xs text-slate-500">Closed</span> : null}
                </div>
                <div className="mt-3 grid gap-2">
                  {dayBookings.map((booking) => (
                    <Link
                      key={booking.id}
                      href={booking.lead?.id ? `/admin/leads/${booking.lead.id}` : "/admin/bookings"}
                      className="rounded-md border border-line bg-white p-2 text-left shadow-sm transition hover:border-accent"
                    >
                      <span className="block text-xs font-medium text-accent">{formatTimeRange(booking.startsAt, booking.endsAt)}</span>
                      <span className="mt-1 block truncate text-sm font-medium text-ink">{booking.customer.name}</span>
                      <span className="mt-1 block truncate text-xs text-slate-500">{booking.service?.name ?? "General"} · {booking.status}</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-ink">Availability summary</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {availability.map((rule) => (
            <span key={rule.id} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 ring-1 ring-slate-200">
              {dayNames[rule.dayOfWeek]} {rule.startTime}-{rule.endTime} UTC
            </span>
          ))}
          {!availability.length ? <p className="text-sm text-slate-600">No active availability rules.</p> : null}
        </div>
      </section>
      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <div className="grid grid-cols-[1fr_1fr_0.7fr_0.7fr] gap-4 border-b border-line px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
          <span>Customer</span>
          <span>Time</span>
          <span>Service</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-line">
          {bookings.map((booking) => (
            <div key={booking.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_1fr_0.7fr_0.7fr] md:items-center">
              <div>
                <p className="font-medium text-ink">{booking.customer.name}</p>
                {booking.lead?.id ? (
                  <Link href={`/admin/leads/${booking.lead.id}`} className="mt-1 block text-sm text-accent">
                    Open lead
                  </Link>
                ) : null}
              </div>
              <p className="text-sm text-slate-700">{new Date(booking.startsAt).toLocaleString()}</p>
              <p className="text-sm text-slate-700">{booking.service?.name ?? "General"}</p>
              <Badge value={booking.status}>{booking.status}</Badge>
            </div>
          ))}
          {!bookings.length ? <p className="px-5 py-8 text-sm text-slate-600">No bookings yet.</p> : null}
        </div>
      </section>
    </AdminShell>
  );
}

function getNextSevenDays() {
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return {
      key: toDateKey(date),
      dayOfWeek: date.getUTCDay(),
      label: `${date.getUTCDate()} ${date.toLocaleString("en", { month: "short", timeZone: "UTC" })}`
    };
  });
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatTimeRange(startsAt: string, endsAt: string) {
  return `${formatTime(startsAt)}-${formatTime(endsAt)}`;
}

function formatTime(value: string) {
  return new Date(value).toISOString().slice(11, 16);
}
