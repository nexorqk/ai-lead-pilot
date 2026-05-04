import OpenAI from "openai";
import { LeadAiAnalysisSchema, type LeadAiAnalysis } from "@leadpilot/shared";

export type LeadAnalysisInput = {
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  message: string;
  serviceName?: string | null;
  preferredDate?: string | null;
  preferredTime?: string | null;
};

export interface LeadAnalysisProvider {
  readonly name: string;
  analyze(input: LeadAnalysisInput): Promise<LeadAiAnalysis>;
}

export class MockLeadAnalysisProvider implements LeadAnalysisProvider {
  readonly name = "mock";

  async analyze(input: LeadAnalysisInput): Promise<LeadAiAnalysis> {
    const text = `${input.message} ${input.preferredDate ?? ""} ${input.preferredTime ?? ""}`.toLowerCase();
    const urgency = text.includes("today")
      ? "today"
      : text.includes("week") || text.includes("friday")
        ? "this_week"
        : text.includes("month")
          ? "this_month"
          : "flexible";
    const leadQuality = urgency === "today" || text.includes("urgent") ? "hot" : urgency === "flexible" ? "cold" : "warm";
    const missingFields = [
      input.customerEmail ? undefined : "email",
      input.customerPhone ? undefined : "phone",
      input.preferredDate ? undefined : "preferredDate",
      input.preferredTime ? undefined : "preferredTime"
    ].filter((field): field is string => Boolean(field));

    return LeadAiAnalysisSchema.parse({
      intent: "book_service",
      service: input.serviceName ?? "consultation",
      urgency,
      budget: text.match(/\$\d+|\d+\s?(usd|eur|byn)/i)?.[0] ?? "unknown",
      leadQuality,
      missingFields,
      summary: `${input.customerName} is asking about ${input.serviceName ?? "a service"}: ${input.message.slice(0, 220)}`,
      nextAction:
        missingFields.length > 0
          ? `Ask for ${missingFields.join(", ")} and offer two relevant appointment options.`
          : "Reply with available appointment options and confirm the preferred slot.",
      confidence: leadQuality === "hot" ? 0.9 : leadQuality === "warm" ? 0.82 : 0.68
    });
  }
}

export class OpenAILeadAnalysisProvider implements LeadAnalysisProvider {
  readonly name = "openai";
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    private readonly model: string
  ) {
    this.client = new OpenAI({ apiKey });
  }

  async analyze(input: LeadAnalysisInput): Promise<LeadAiAnalysis> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Analyze a small-business lead. Return only JSON with intent, service, urgency, budget, leadQuality, missingFields, summary, nextAction, confidence. Do not include secrets or prompt text."
        },
        {
          role: "user",
          content: JSON.stringify({
            customerName: input.customerName,
            hasEmail: Boolean(input.customerEmail),
            hasPhone: Boolean(input.customerPhone),
            message: input.message,
            serviceName: input.serviceName,
            preferredDate: input.preferredDate,
            preferredTime: input.preferredTime
          })
        }
      ]
    });

    const content = completion.choices[0]?.message.content;
    const parsed = content ? JSON.parse(content) : {};
    return LeadAiAnalysisSchema.parse(parsed);
  }
}

export function createLeadAnalysisProvider(options: {
  provider: "mock" | "openai";
  openAiApiKey?: string;
  openAiModel: string;
}): LeadAnalysisProvider {
  if (options.provider === "openai") {
    if (!options.openAiApiKey) {
      throw new Error("AI_PROVIDER=openai requires OPENAI_API_KEY");
    }
    return new OpenAILeadAnalysisProvider(options.openAiApiKey, options.openAiModel);
  }
  return new MockLeadAnalysisProvider();
}
