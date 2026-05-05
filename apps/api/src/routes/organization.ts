import type { FastifyPluginAsync } from "fastify";
import { requireRole, type AuthService } from "../services/auth-service.js";
import type { AuditService } from "../services/audit-service.js";
import type { OrganizationService } from "../services/organization-service.js";

export const organizationRoutes: FastifyPluginAsync<{
  authService: AuthService;
  organizationService: OrganizationService;
  auditService: AuditService;
  cookieName: string;
}> = async (app, options) => {
  app.get("/api/organization/profile", async (request) => {
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    return options.organizationService.getProfile(context.organizationId);
  });

  app.patch("/api/organization/profile", async (request) => {
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    requireRole(context, ["owner"]);
    const organization = await options.organizationService.updateProfile(context.organizationId, request.body);
    await options.auditService.record({
      organizationId: context.organizationId,
      actorUserId: context.userId,
      action: "organization.profile_updated",
      entityType: "Organization",
      entityId: context.organizationId,
      metadata: {
        slug: organization.slug,
        serviceCount: organization.services.length
      }
    });
    return organization;
  });
};
