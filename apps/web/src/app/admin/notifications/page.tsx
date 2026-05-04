import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/badge";
import {
  getAuditLogs,
  getNotificationPreferences,
  getNotifications,
  type AuditLog,
  type Notification,
  type NotificationPreference
} from "@/lib/api";
import { requireCurrentUser } from "@/lib/server-auth";

export default async function NotificationsPage() {
  const { user, cookieHeader } = await requireCurrentUser();
  let notifications: Notification[] = [];
  let preferences: NotificationPreference[] = [];
  let auditLogs: AuditLog[] = [];
  let error: string | null = null;

  try {
    [notifications, preferences, auditLogs] = await Promise.all([
      getNotifications(cookieHeader),
      getNotificationPreferences(cookieHeader),
      getAuditLogs(cookieHeader)
    ]);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "API unavailable";
  }

  return (
    <AdminShell user={user}>
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-accent">Operations</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Notifications</h1>
      </div>
      {error ? <p className="mt-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">API unavailable: {error}</p> : null}

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-ink">Preferences</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {preferences.map((preference) => (
            <div key={preference.id} className="rounded-md bg-slate-50 px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-ink">{preference.type}</span>
                <Badge value={preference.enabled ? "qualified" : "lost"}>{preference.enabled ? "enabled" : "disabled"}</Badge>
              </div>
              <p className="mt-1 text-slate-600">
                {preference.channel} to {preference.recipient}
              </p>
            </div>
          ))}
          {!preferences.length ? <p className="text-sm text-slate-600">No notification preferences configured.</p> : null}
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-semibold text-ink">Recent notification attempts</h2>
        </div>
        <div className="divide-y divide-line">
          {notifications.map((notification) => (
            <div key={notification.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_0.8fr_0.5fr] md:items-center">
              <div>
                <p className="font-medium text-ink">{notification.subject ?? notification.type}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {notification.channel} to {notification.recipient}
                </p>
              </div>
              <p className="text-sm text-slate-600">{new Date(notification.createdAt).toLocaleString()}</p>
              <Badge value={notification.status}>{notification.status}</Badge>
            </div>
          ))}
          {!notifications.length ? <p className="px-5 py-8 text-sm text-slate-600">No notifications yet.</p> : null}
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-semibold text-ink">Audit trail</h2>
        </div>
        <div className="divide-y divide-line">
          {auditLogs.map((entry) => (
            <div key={entry.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_0.8fr_0.8fr] md:items-center">
              <div>
                <p className="font-medium text-ink">{entry.action}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {entry.entityType} · {entry.entityId}
                </p>
              </div>
              <p className="text-sm text-slate-600">{entry.actor?.email ?? "system"}</p>
              <p className="text-sm text-slate-600">{new Date(entry.createdAt).toLocaleString()}</p>
            </div>
          ))}
          {!auditLogs.length ? <p className="px-5 py-8 text-sm text-slate-600">No audit events yet.</p> : null}
        </div>
      </section>
    </AdminShell>
  );
}
