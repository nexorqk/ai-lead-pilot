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

export const OrganizationSlugParamsSchema = z.object({
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
});

export const PublicServiceInputSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  durationMin: z.coerce.number().int().min(15).max(480),
  active: z.coerce.boolean().default(true)
});

export const UpdateOrganizationProfileInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  timezone: z.string().trim().min(2).max(80),
  services: z.array(PublicServiceInputSchema).min(1).max(12)
});

export const UserRoleSchema = z.enum(["owner", "manager", "staff", "viewer"]);
export const LeadAiAnalysisJobStatusSchema = z.enum(["pending", "processing", "completed", "failed"]);

export const LeadAnalysisQueueJobSchema = z.object({
  organizationId: z.string().cuid(),
  leadId: z.string().cuid(),
  analysisJobId: z.string().cuid()
});

export const NotificationQueueJobSchema = z.object({
  notificationId: z.string().cuid(),
  organizationId: z.string().cuid()
});

export const LoginInputSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(200)
});

export const PasswordSetupTokenParamsSchema = z.object({
  token: z.string().trim().min(20).max(200)
});

export const ResetPasswordTokenParamsSchema = z.object({
  token: z.string().trim().min(20).max(200)
});

export const PasswordSetupInputSchema = z.object({
  token: z.string().trim().min(20).max(200),
  password: z.string().min(8).max(200)
});

export const PasswordSetupPreviewSchema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().min(2).max(120),
  organizationName: z.string().trim().min(1).max(120),
  expiresAt: z.string().datetime()
});

export const ForgotPasswordInputSchema = z.object({
  email: z.string().trim().email().max(255)
});

export const ResetPasswordInputSchema = z.object({
  token: z.string().trim().min(20).max(200),
  password: z.string().min(8).max(200)
});

export const ResetPasswordPreviewSchema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().min(2).max(120),
  expiresAt: z.string().datetime()
});

export const TeamMemberInputSchema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().min(2).max(120),
  role: UserRoleSchema.default("viewer")
});

export const TeamMemberIdParamsSchema = z.object({
  id: z.string().cuid()
});

export const UpdateTeamMemberRoleInputSchema = z.object({
  role: UserRoleSchema
});

export const BookingStatusSchema = z.enum(["requested", "confirmed", "cancelled", "completed"]);

export const CreateLeadBookingInputSchema = z.object({
  startsAt: z.string().datetime(),
  serviceId: z.string().cuid().optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  status: BookingStatusSchema.default("requested")
});

export type CustomerInput = z.infer<typeof CustomerInputSchema>;
export type CreateLeadInput = z.infer<typeof CreateLeadInputSchema>;
export type LeadAiAnalysis = z.infer<typeof LeadAiAnalysisSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type LeadAiAnalysisJobStatus = z.infer<typeof LeadAiAnalysisJobStatusSchema>;
export type LeadAnalysisQueueJob = z.infer<typeof LeadAnalysisQueueJobSchema>;
export type NotificationQueueJob = z.infer<typeof NotificationQueueJobSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
export type PasswordSetupInput = z.infer<typeof PasswordSetupInputSchema>;
export type PasswordSetupPreview = z.infer<typeof PasswordSetupPreviewSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInputSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;
export type ResetPasswordPreview = z.infer<typeof ResetPasswordPreviewSchema>;
export type TeamMemberInput = z.infer<typeof TeamMemberInputSchema>;
export type UpdateTeamMemberRoleInput = z.infer<typeof UpdateTeamMemberRoleInputSchema>;
export type BookingStatus = z.infer<typeof BookingStatusSchema>;
export type CreateLeadBookingInput = z.infer<typeof CreateLeadBookingInputSchema>;
export type PublicServiceInput = z.infer<typeof PublicServiceInputSchema>;
export type UpdateOrganizationProfileInput = z.infer<typeof UpdateOrganizationProfileInputSchema>;

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};
