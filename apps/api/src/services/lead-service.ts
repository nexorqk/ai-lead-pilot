import type { PrismaClient } from "@prisma/client";
import { CreateLeadInputSchema, LeadAiAnalysisSchema, type CreateLeadInput } from "@leadpilot/shared";
import type { LeadAnalysisProvider } from "../ai/provider.js";
import { AppError } from "../utils/errors.js";

export class LeadService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly aiProvider: LeadAnalysisProvider
  ) {}

  async createLead(organizationId: string, rawInput: unknown) {
    const input = CreateLeadInputSchema.parse(rawInput);
    const service = input.serviceSlug
      ? await this.prisma.service.findUnique({
          where: { organizationId_slug: { organizationId, slug: input.serviceSlug } }
        })
      : null;

    const customer = await this.findOrCreateCustomer(organizationId, input);
    const lead = await this.prisma.lead.create({
      data: {
        organizationId,
        customerId: customer.id,
        serviceId: service?.id,
        preferredDate: input.preferredDate || null,
        preferredTime: input.preferredTime || null,
        messages: {
          create: {
            body: input.message
          }
        }
      },
      include: {
        customer: true,
        service: true,
        messages: { orderBy: { createdAt: "asc" } }
      }
    });

    return {
      id: lead.id,
      status: lead.status,
      quality: lead.quality,
      customer: {
        name: lead.customer.name,
        email: lead.customer.email,
        phone: lead.customer.phone
      }
    };
  }

  async listLeads(organizationId: string) {
    return this.prisma.lead.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        service: true,
        messages: { orderBy: { createdAt: "asc" }, take: 1 },
        aiAnalyses: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    });
  }

  async getLead(organizationId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        service: true,
        messages: { orderBy: { createdAt: "asc" } },
        aiAnalyses: { orderBy: { createdAt: "desc" } },
        bookings: { orderBy: { startsAt: "desc" } }
      }
    });
    if (!lead) {
      throw new AppError(404, "LEAD_NOT_FOUND", "Lead was not found");
    }
    return lead;
  }

  async analyzeLead(organizationId: string, id: string) {
    const lead = await this.getLead(organizationId, id);
    const firstMessage = lead.messages[0]?.body;
    if (!firstMessage) {
      throw new AppError(422, "LEAD_HAS_NO_MESSAGE", "Lead has no message to analyze");
    }

    const analysis = LeadAiAnalysisSchema.parse(
      await this.aiProvider.analyze({
        customerName: lead.customer.name,
        customerEmail: lead.customer.email,
        customerPhone: lead.customer.phone,
        message: firstMessage,
        serviceName: lead.service?.name,
        preferredDate: lead.preferredDate,
        preferredTime: lead.preferredTime
      })
    );

    const saved = await this.prisma.$transaction(async (tx) => {
      const created = await tx.leadAiAnalysis.create({
        data: {
          leadId: lead.id,
          provider: this.aiProvider.name,
          intent: analysis.intent,
          service: analysis.service,
          urgency: analysis.urgency,
          budget: analysis.budget,
          leadQuality: analysis.leadQuality,
          missingFields: analysis.missingFields,
          summary: analysis.summary,
          nextAction: analysis.nextAction,
          confidence: analysis.confidence
        }
      });
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          quality: analysis.leadQuality,
          status: analysis.leadQuality === "cold" ? "new" : "qualified"
        }
      });
      return created;
    });

    return {
      leadId: lead.id,
      leadQuality: saved.leadQuality,
      urgency: saved.urgency,
      summary: saved.summary,
      missingFields: saved.missingFields,
      nextAction: saved.nextAction,
      confidence: saved.confidence
    };
  }

  async dashboardSummary(organizationId: string) {
    const [totalLeads, statuses, qualities] = await Promise.all([
      this.prisma.lead.count({ where: { organizationId } }),
      this.prisma.lead.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: true
      }),
      this.prisma.lead.groupBy({
        by: ["quality"],
        where: { organizationId },
        _count: true
      })
    ]);

    const statusCount = Object.fromEntries(statuses.map((item) => [item.status, item._count]));
    const qualityCount = Object.fromEntries(qualities.map((item) => [item.quality, item._count]));

    return {
      totalLeads,
      newLeads: statusCount.new ?? 0,
      qualifiedLeads: statusCount.qualified ?? 0,
      bookedLeads: statusCount.booked ?? 0,
      hotLeads: qualityCount.hot ?? 0,
      warmLeads: qualityCount.warm ?? 0,
      coldLeads: qualityCount.cold ?? 0
    };
  }

  private async findOrCreateCustomer(organizationId: string, input: CreateLeadInput) {
    const email = input.customer.email || null;
    const phone = input.customer.phone || null;
    const existing = await this.prisma.customer.findFirst({
      where: {
        organizationId,
        OR: [email ? { email } : undefined, phone ? { phone } : undefined].filter(Boolean) as Array<
          { email: string } | { phone: string }
        >
      }
    });

    if (existing) {
      return this.prisma.customer.update({
        where: { id: existing.id },
        data: {
          name: input.customer.name,
          email: email ?? existing.email,
          phone: phone ?? existing.phone
        }
      });
    }

    return this.prisma.customer.create({
      data: {
        organizationId,
        name: input.customer.name,
        email,
        phone
      }
    });
  }
}
