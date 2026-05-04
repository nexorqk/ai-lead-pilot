import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { LeadIdParamsSchema } from "@leadpilot/shared";
import type { LeadService } from "../services/lead-service.js";
import { getDemoOrganizationId } from "../services/organization-context.js";

type RouteOptions = {
  leadService: LeadService;
  prisma: PrismaClient;
  configuredDemoOrganizationId?: string;
};

export const leadRoutes: FastifyPluginAsync<RouteOptions> = async (app, options) => {
  app.get("/api/leads", async () => {
    const organizationId = await getDemoOrganizationId(options.prisma, options.configuredDemoOrganizationId);
    return options.leadService.listLeads(organizationId);
  });

  app.get("/api/leads/:id", async (request) => {
    const { id } = LeadIdParamsSchema.parse(request.params);
    const organizationId = await getDemoOrganizationId(options.prisma, options.configuredDemoOrganizationId);
    return options.leadService.getLead(organizationId, id);
  });

  app.post("/api/leads", async (request, reply) => {
    const organizationId = await getDemoOrganizationId(options.prisma, options.configuredDemoOrganizationId);
    const lead = await options.leadService.createLead(organizationId, request.body);
    return reply.status(201).send(lead);
  });

  app.post("/api/leads/:id/analyze", async (request) => {
    const { id } = LeadIdParamsSchema.parse(request.params);
    const organizationId = await getDemoOrganizationId(options.prisma, options.configuredDemoOrganizationId);
    return options.leadService.analyzeLead(organizationId, id);
  });
};
