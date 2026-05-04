import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { LeadIdParamsSchema } from "@leadpilot/shared";
import type { LeadService } from "../services/lead-service.js";
import { getDemoOrganizationId } from "../services/organization-context.js";
import { requireRole, type AuthService } from "../services/auth-service.js";

type RouteOptions = {
  leadService: LeadService;
  authService: AuthService;
  prisma: PrismaClient;
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
    return reply.status(201).send(lead);
  });

  app.post("/api/leads/:id/analyze", async (request) => {
    const { id } = LeadIdParamsSchema.parse(request.params);
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    requireRole(context, ["owner", "manager", "staff"]);
    return options.leadService.analyzeLead(context.organizationId, id);
  });
};
