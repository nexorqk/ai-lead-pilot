import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";
import type { LeadService } from "../services/lead-service.js";
import { getDemoOrganizationId } from "../services/organization-context.js";

export const dashboardRoutes: FastifyPluginAsync<{
  leadService: LeadService;
  prisma: PrismaClient;
  configuredDemoOrganizationId?: string;
}> = async (app, options) => {
  app.get("/api/dashboard/summary", async () => {
    const organizationId = await getDemoOrganizationId(options.prisma, options.configuredDemoOrganizationId);
    return options.leadService.dashboardSummary(organizationId);
  });
};
