import { describe, expect, it } from "vitest";
import {
  CreateLeadBookingInputSchema,
  CreateLeadInputSchema,
  LeadAiAnalysisSchema,
  LeadAnalysisQueueJobSchema,
  LoginInputSchema,
  NotificationQueueJobSchema,
  TeamMemberInputSchema
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
});
