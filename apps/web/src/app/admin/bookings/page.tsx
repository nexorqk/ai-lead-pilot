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

  return (
    <AdminShell user={user}>
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-accent">Calendar</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Bookings</h1>
      </div>
      {error ? <p className="mt-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">API unavailable: {error}</p> : null}
      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-ink">Availability</h2>
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
