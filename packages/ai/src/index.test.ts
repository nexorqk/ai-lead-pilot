import { describe, expect, it } from "vitest";
import { createLeadAnalysisProvider, MockLeadAnalysisProvider } from "./index.js";

const baseInput = {
  customerName: "Maya Chen",
  customerEmail: "maya@example.com",
  customerPhone: "+1555010101",
  message: "I need an urgent consultation today and can spend $200.",
  serviceName: "Consultation",
  preferredDate: "2026-05-08",
  preferredTime: "10:00"
};

describe("MockLeadAnalysisProvider", () => {
  it("classifies urgent same-day leads as hot", async () => {
    const provider = new MockLeadAnalysisProvider();
    const analysis = await provider.analyze(baseInput);

    expect(analysis.urgency).toBe("today");
    expect(analysis.leadQuality).toBe("hot");
    expect(analysis.budget).toBe("$200");
    expect(analysis.missingFields).toEqual([]);
  });

  it("reports missing contact and preferred time fields deterministically", async () => {
    const provider = new MockLeadAnalysisProvider();
    const analysis = await provider.analyze({
      customerName: "Sam Rivera",
      message: "I may need a consultation later this month.",
      serviceName: "Consultation"
    });

    expect(analysis.urgency).toBe("this_month");
    expect(analysis.leadQuality).toBe("warm");
    expect(analysis.missingFields).toEqual(["email", "phone", "preferredDate", "preferredTime"]);
    expect(analysis.nextAction).toContain("Ask for email, phone, preferredDate, preferredTime");
  });

  it("refuses OpenAI provider without an API key", () => {
    expect(() => createLeadAnalysisProvider({ provider: "openai", openAiModel: "gpt-4o-mini" })).toThrow(
      "AI_PROVIDER=openai requires OPENAI_API_KEY"
    );
  });
});
