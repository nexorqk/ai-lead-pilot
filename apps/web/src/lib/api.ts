import {
  CreateLeadInputSchema,
  LoginInputSchema,
  TeamMemberInputSchema,
  type CreateLeadInput,
  type LoginInput,
  type TeamMemberInput
} from "@leadpilot/shared";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...init?.headers
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? `API request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export type LeadListItem = {
  id: string;
  status: string;
  quality: string;
  createdAt: string;
  preferredDate?: string | null;
  preferredTime?: string | null;
  customer: { name: string; email?: string | null; phone?: string | null };
  service?: { name: string; slug: string } | null;
  messages: Array<{ body: string }>;
  aiAnalyses: Array<{ summary: string; nextAction: string; confidence: number; missingFields: unknown }>;
  aiAnalysisJobs: Array<{
    id: string;
    status: string;
    error?: string | null;
    createdAt: string;
    startedAt?: string | null;
    completedAt?: string | null;
  }>;
};

export type LeadDetail = LeadListItem & {
  messages: Array<{ id: string; body: string; createdAt: string }>;
  aiAnalyses: Array<{
    id: string;
    provider: string;
    urgency: string;
    leadQuality: string;
    summary: string;
    nextAction: string;
    missingFields: unknown;
    confidence: number;
    createdAt: string;
  }>;
  bookings: Booking[];
};

export type DashboardSummary = {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  bookedLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  upcomingBookings: Booking[];
};

export type Booking = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  notes?: string | null;
  customer: { name: string; email?: string | null; phone?: string | null };
  service?: { id: string; name: string; slug: string; durationMin: number } | null;
  lead?: { id: string } | null;
};

export type AvailabilityRule = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type Notification = {
  id: string;
  type: string;
  channel: string;
  recipient: string;
  subject?: string | null;
  body: string;
  status: string;
  attempts: number;
  error?: string | null;
  sentAt?: string | null;
  createdAt: string;
};

export type NotificationPreference = {
  id: string;
  type: string;
  channel: string;
  recipient: string;
  enabled: boolean;
};

export type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: unknown;
  createdAt: string;
  actor?: { name: string; email: string } | null;
};

export type TeamMember = {
  id: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    hasPassword: boolean;
    createdAt: string;
  };
};

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  organization: {
    id: string;
    name: string;
    role: string;
  };
};

export async function login(input: LoginInput) {
  return request<{ user: CurrentUser; expiresAt: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(LoginInputSchema.parse(input))
  });
}

export async function logout() {
  return request<{ ok: true }>("/api/auth/logout", { method: "POST" });
}

export async function getCurrentUser(cookieHeader?: string) {
  return request<{ user: CurrentUser }>("/api/auth/me", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined
  });
}

export async function getDashboardSummary(cookieHeader?: string) {
  return request<DashboardSummary>("/api/dashboard/summary", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined
  });
}

export async function getLeads(cookieHeader?: string) {
  return request<LeadListItem[]>("/api/leads", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined
  });
}

export async function getBookings(cookieHeader?: string) {
  return request<Booking[]>("/api/bookings", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined
  });
}

export async function getAvailability(cookieHeader?: string) {
  return request<AvailabilityRule[]>("/api/availability", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined
  });
}

export async function getNotifications(cookieHeader?: string) {
  return request<Notification[]>("/api/notifications", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined
  });
}

export async function getNotificationPreferences(cookieHeader?: string) {
  return request<NotificationPreference[]>("/api/notification-preferences", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined
  });
}

export async function getAuditLogs(cookieHeader?: string) {
  return request<AuditLog[]>("/api/audit-logs", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined
  });
}

export async function getTeamMembers(cookieHeader?: string) {
  return request<TeamMember[]>("/api/team/members", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined
  });
}

export async function createTeamMember(input: TeamMemberInput) {
  return request<TeamMember>("/api/team/members", {
    method: "POST",
    body: JSON.stringify(TeamMemberInputSchema.parse(input))
  });
}

export async function getLead(id: string, cookieHeader?: string) {
  return request<LeadDetail>(`/api/leads/${id}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined
  });
}

export async function createLead(input: CreateLeadInput) {
  return request<{ id: string; status: string }>("/api/leads", {
    method: "POST",
    body: JSON.stringify(CreateLeadInputSchema.parse(input))
  });
}

export async function analyzeLead(id: string) {
  return request<{ leadId: string; analysisJobId: string; status: string; bullmqJobId?: string | number }>(`/api/leads/${id}/analyze`, {
    method: "POST"
  });
}

export async function createLeadBooking(
  leadId: string,
  input: { startsAt: string; serviceId?: string; notes?: string; status?: "requested" | "confirmed" }
) {
  return request<Booking>(`/api/leads/${leadId}/bookings`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}
