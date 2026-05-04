import { z } from "zod";

export const leadStatusValues = ["new", "qualified", "contacted", "booked", "lost"] as const;
export const leadQualityValues = ["hot", "warm", "cold", "unknown"] as const;
export const leadUrgencyValues = ["today", "this_week", "this_month", "flexible", "unknown"] as const;

export const LeadStatusSchema = z.enum(leadStatusValues);
export const LeadQualitySchema = z.enum(leadQualityValues);
export const LeadUrgencySchema = z.enum(leadUrgencyValues);

export type LeadStatus = z.infer<typeof LeadStatusSchema>;
export type LeadQuality = z.infer<typeof LeadQualitySchema>;
export type LeadUrgency = z.infer<typeof LeadUrgencySchema>;

export const CustomerInputSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(255).optional().or(z.literal("")),
    phone: z.string().trim().min(5).max(40).optional().or(z.literal(""))
  })
  .refine((value) => Boolean(value.email || value.phone), {
    message: "Provide either email or phone",
    path: ["email"]
  });

export const CreateLeadInputSchema = z.object({
  customer: CustomerInputSchema,
  message: z.string().trim().min(10).max(4000),
  serviceSlug: z.string().trim().min(1).max(80).optional(),
  preferredDate: z.string().trim().max(40).optional().or(z.literal("")),
  preferredTime: z.string().trim().max(40).optional().or(z.literal(""))
});

export const LeadAiAnalysisSchema = z.object({
  intent: z.string().trim().min(2).max(80),
  service: z.string().trim().min(2).max(120),
  urgency: LeadUrgencySchema,
  budget: z.string().trim().min(1).max(120),
  leadQuality: LeadQualitySchema,
  missingFields: z.array(z.string().trim().min(1).max(80)).max(12),
  summary: z.string().trim().min(10).max(1000),
  nextAction: z.string().trim().min(5).max(1000),
  confidence: z.number().min(0).max(1)
});

export const LeadIdParamsSchema = z.object({
  id: z.string().cuid()
});

export type CustomerInput = z.infer<typeof CustomerInputSchema>;
export type CreateLeadInput = z.infer<typeof CreateLeadInputSchema>;
export type LeadAiAnalysis = z.infer<typeof LeadAiAnalysisSchema>;

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};
