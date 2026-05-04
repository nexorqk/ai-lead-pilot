import { CreateLeadInputSchema, type CreateLeadInput } from "@leadpilot/shared";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
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
};

export type DashboardSummary = {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  bookedLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
};

export async function getDashboardSummary() {
  return request<DashboardSummary>("/api/dashboard/summary");
}

export async function getLeads() {
  return request<LeadListItem[]>("/api/leads");
}

export async function getLead(id: string) {
  return request<LeadDetail>(`/api/leads/${id}`);
}

export async function createLead(input: CreateLeadInput) {
  return request<{ id: string; status: string }>("/api/leads", {
    method: "POST",
    body: JSON.stringify(CreateLeadInputSchema.parse(input))
  });
}

export async function analyzeLead(id: string) {
  return request(`/api/leads/${id}/analyze`, { method: "POST" });
}
