import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";
import type { Queue } from "bullmq";
import type { LeadAnalysisQueueJob } from "@leadpilot/shared";
import { LeadIdParamsSchema } from "@leadpilot/shared";
import type { LeadService } from "../services/lead-service.js";
import type { NotificationService } from "../services/notification-service.js";
import type { AuditService } from "../services/audit-service.js";
import { getDemoOrganizationId } from "../services/organization-context.js";
import { requireRole, type AuthService } from "../services/auth-service.js";
import { AppError } from "../utils/errors.js";

type RouteOptions = {
  leadService: LeadService;
  notificationService: NotificationService;
  auditService: AuditService;
  authService: AuthService;
  prisma: PrismaClient;
  analysisQueue?: Queue<LeadAnalysisQueueJob>;
  cookieName: string;
  configuredDemoOrganizationId?: string;
};

export const leadRoutes: FastifyPluginAsync<RouteOptions> = async (app, options) => {
  app.get("/api/leads", async (request) => {
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    return options.leadService.listLeads(context.organizationId);
  });

  app.get("/api/leads/:id", async (request) => {
    const { id } = LeadIdParamsSchema.parse(request.params);
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    return options.leadService.getLead(context.organizationId, id);
  });

  app.post("/api/leads", async (request, reply) => {
    const organizationId = await getDemoOrganizationId(options.prisma, options.configuredDemoOrganizationId);
    const lead = await options.leadService.createLead(organizationId, request.body);
    await options.notificationService.notifyOrganization({
      organizationId,
      type: "lead_created",
      subject: `New lead from ${lead.customer.name}`,
      body: `${lead.customer.name} submitted a new lead. Review it in LeadPilot AI.`
    });
    await options.auditService.record({
      organizationId,
      action: "lead.created",
      entityType: "Lead",
      entityId: lead.id,
      metadata: { source: "public_form", customer: lead.customer.name }
    });
    return reply.status(201).send(lead);
  });

  app.post("/api/leads/:id/analyze", async (request) => {
    const { id } = LeadIdParamsSchema.parse(request.params);
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    requireRole(context, ["owner", "manager", "staff"]);
    if (!options.analysisQueue) {
      throw new AppError(503, "ANALYSIS_QUEUE_UNAVAILABLE", "Lead analysis queue is not configured");
    }

    const analysisJob = await options.leadService.createAnalysisJob(context.organizationId, id);
    try {
      const queued = await options.analysisQueue.add(
        "analyze-lead",
        {
          organizationId: context.organizationId,
          leadId: id,
          analysisJobId: analysisJob.id
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 250
        }
      );
      await options.prisma.leadAiAnalysisJob.update({
        where: { id: analysisJob.id },
        data: { bullmqJobId: queued.id }
      });
      await options.auditService.record({
        organizationId: context.organizationId,
        actorUserId: context.userId,
        action: "lead.analysis_queued",
        entityType: "Lead",
        entityId: id,
        metadata: { analysisJobId: analysisJob.id, bullmqJobId: queued.id }
      });
      return {
        leadId: id,
        analysisJobId: analysisJob.id,
        status: analysisJob.status,
        bullmqJobId: queued.id
      };
    } catch (error) {
      await options.prisma.leadAiAnalysisJob.update({
        where: { id: analysisJob.id },
        data: {
          status: "failed",
          completedAt: new Date(),
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  });

  app.get("/api/leads/:id/analysis-job", async (request) => {
    const { id } = LeadIdParamsSchema.parse(request.params);
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    await options.leadService.getLead(context.organizationId, id);
    const latestJob = await options.prisma.leadAiAnalysisJob.findFirst({
      where: { leadId: id },
      orderBy: { createdAt: "desc" }
    });
    return { job: latestJob };
  });
};
