import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";
import type { LeadService } from "../services/lead-service.js";
import type { AuthService } from "../services/auth-service.js";

export const dashboardRoutes: FastifyPluginAsync<{
  leadService: LeadService;
  authService: AuthService;
  prisma: PrismaClient;
  cookieName: string;
}> = async (app, options) => {
  app.get("/api/dashboard/summary", async (request) => {
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    return options.leadService.dashboardSummary(context.organizationId);
  });
};
