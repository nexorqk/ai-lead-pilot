import type { FastifyPluginAsync } from "fastify";
import type { AuthService } from "../services/auth-service.js";
import type { NotificationService } from "../services/notification-service.js";
import type { AuditService } from "../services/audit-service.js";

export const notificationRoutes: FastifyPluginAsync<{
  authService: AuthService;
  notificationService: NotificationService;
  auditService: AuditService;
  cookieName: string;
}> = async (app, options) => {
  app.get("/api/notifications", async (request) => {
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    return options.notificationService.list(context.organizationId);
  });

  app.get("/api/notification-preferences", async (request) => {
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    return options.notificationService.preferences(context.organizationId);
  });

  app.get("/api/audit-logs", async (request) => {
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    return options.auditService.list(context.organizationId);
  });
};
