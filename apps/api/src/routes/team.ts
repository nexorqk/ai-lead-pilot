import type { FastifyPluginAsync } from "fastify";
import { TeamMemberIdParamsSchema } from "@leadpilot/shared";
import { requireRole, type AuthService } from "../services/auth-service.js";
import type { AuditService } from "../services/audit-service.js";
import type { TeamService } from "../services/team-service.js";

export const teamRoutes: FastifyPluginAsync<{
  authService: AuthService;
  teamService: TeamService;
  auditService: AuditService;
  cookieName: string;
}> = async (app, options) => {
  app.get("/api/team/members", async (request) => {
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    return options.teamService.listMembers(context.organizationId);
  });

  app.post("/api/team/members", async (request, reply) => {
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    requireRole(context, ["owner"]);
    const member = await options.teamService.createMember(context.organizationId, request.body);
    await options.auditService.record({
      organizationId: context.organizationId,
      actorUserId: context.userId,
      action: "team.member_created",
      entityType: "OrganizationMember",
      entityId: member.id,
      metadata: { role: member.role, email: member.user.email }
    });
    return reply.status(201).send(member);
  });

  app.patch("/api/team/members/:id/role", async (request) => {
    const { id } = TeamMemberIdParamsSchema.parse(request.params);
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    requireRole(context, ["owner"]);
    const member = await options.teamService.updateMemberRole(context.organizationId, id, request.body);
    await options.auditService.record({
      organizationId: context.organizationId,
      actorUserId: context.userId,
      action: "team.member_role_updated",
      entityType: "OrganizationMember",
      entityId: member.id,
      metadata: { role: member.role, email: member.user.email }
    });
    return member;
  });

  app.delete("/api/team/members/:id", async (request) => {
    const { id } = TeamMemberIdParamsSchema.parse(request.params);
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    requireRole(context, ["owner"]);
    const result = await options.teamService.removeMember(context.organizationId, id, context.userId);
    await options.auditService.record({
      organizationId: context.organizationId,
      actorUserId: context.userId,
      action: "team.member_removed",
      entityType: "OrganizationMember",
      entityId: id
    });
    return result;
  });
};
