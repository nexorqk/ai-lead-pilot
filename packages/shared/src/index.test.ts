import { describe, expect, it } from "vitest";
import {
  CreateLeadBookingInputSchema,
  CreateLeadInputSchema,
  LeadAiAnalysisSchema,
  LeadAnalysisQueueJobSchema,
  LoginInputSchema,
  NotificationQueueJobSchema,
  OrganizationSlugParamsSchema,
  PasswordSetupInputSchema,
  TeamMemberInputSchema,
  UpdateAvailabilityRulesInputSchema,
  UpdateOrganizationProfileInputSchema
} from "./index.js";

describe("shared schemas", () => {
  it("accepts a valid public lead with email contact", () => {
    const parsed = CreateLeadInputSchema.parse({
      customer: {
        name: "Alex Carter",
        email: "alex@example.com"
      },
      message: "I need a haircut this week, preferably Friday evening.",
      serviceSlug: "haircut",
      preferredDate: "2026-05-08",
      preferredTime: "18:00"
    });

    expect(parsed.customer.email).toBe("alex@example.com");
    expect(parsed.serviceSlug).toBe("haircut");
  });

  it("rejects leads without email or phone", () => {
    const result = CreateLeadInputSchema.safeParse({
      customer: {
        name: "Alex Carter"
      },
      message: "I need a consultation this week."
    });

    expect(result.success).toBe(false);
  });

  it("validates AI analysis confidence and enums", () => {
    expect(() =>
      LeadAiAnalysisSchema.parse({
        intent: "book_service",
        service: "consultation",
        urgency: "this_week",
        budget: "unknown",
        leadQuality: "warm",
        missingFields: ["phone"],
        summary: "Customer wants a consultation this week but did not provide phone.",
        nextAction: "Ask for phone number and offer two available slots.",
        confidence: 1.2
      })
    ).toThrow();
  });

  it("defaults booking status to requested", () => {
    const parsed = CreateLeadBookingInputSchema.parse({
      startsAt: "2026-05-08T10:00:00.000Z"
    });

    expect(parsed.status).toBe("requested");
  });

  it("validates auth and queue payload contracts", () => {
    expect(LoginInputSchema.parse({ email: "owner@example.com", password: "password-123" }).email).toBe("owner@example.com");
    expect(TeamMemberInputSchema.parse({ name: "Desk User", email: "desk@example.com" }).role).toBe("viewer");
    expect(PasswordSetupInputSchema.parse({ token: "a".repeat(32), password: "password-123" }).token).toHaveLength(32);
    expect(OrganizationSlugParamsSchema.parse({ slug: "demo-studio" }).slug).toBe("demo-studio");
    expect(
      LeadAnalysisQueueJobSchema.safeParse({
        organizationId: "cmor4a34z0000x5xa9epccrpr",
        leadId: "cmoraeu3z000rx54k2gv9kyp9",
        analysisJobId: "cmorb2zbq0003x56za54fro4n"
      }).success
    ).toBe(true);
    expect(
      NotificationQueueJobSchema.safeParse({
        notificationId: "cmorb2zbq0003x56za54fro4n",
        organizationId: "cmor4a34z0000x5xa9epccrpr"
      }).success
    ).toBe(true);
  });

  it("validates organization profile settings", () => {
    const parsed = UpdateOrganizationProfileInputSchema.parse({
      name: "Demo Studio",
      slug: "demo-studio",
      timezone: "Europe/Minsk",
      services: [
        {
          name: "Consultation",
          slug: "consultation",
          description: "Initial consultation.",
          durationMin: "60",
          active: true
        }
      ]
    });

    expect(parsed.services[0]?.durationMin).toBe(60);
    expect(UpdateOrganizationProfileInputSchema.safeParse({ ...parsed, slug: "Bad Slug" }).success).toBe(false);
  });

  it("validates availability rule settings", () => {
    const parsed = UpdateAvailabilityRulesInputSchema.parse({
      rules: [{ dayOfWeek: "2", startTime: "09:00", endTime: "17:00" }]
    });

    expect(parsed.rules[0]?.dayOfWeek).toBe(2);
    expect(UpdateAvailabilityRulesInputSchema.safeParse({ rules: [{ dayOfWeek: 2, startTime: "17:00", endTime: "09:00" }] }).success).toBe(false);
    expect(UpdateAvailabilityRulesInputSchema.safeParse({ rules: [{ dayOfWeek: 8, startTime: "09:00", endTime: "17:00" }] }).success).toBe(false);
  });
});
