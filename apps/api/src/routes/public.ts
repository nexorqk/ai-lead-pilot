import type { FastifyPluginAsync } from "fastify";
import { OrganizationSlugParamsSchema } from "@leadpilot/shared";
import type { LeadService } from "../services/lead-service.js";
import type { NotificationService } from "../services/notification-service.js";
import type { AuditService } from "../services/audit-service.js";
import type { PrismaClient } from "@prisma/client";
import { AppError } from "../utils/errors.js";

export const publicRoutes: FastifyPluginAsync<{
  prisma: PrismaClient;
  leadService: LeadService;
  notificationService: NotificationService;
  auditService: AuditService;
  publicRateLimit: {
    max: number;
    timeWindow: string;
  };
}> = async (app, options) => {
  app.get("/api/public/organizations/:slug", async (request) => {
    const { slug } = OrganizationSlugParamsSchema.parse(request.params);
    const organization = await options.prisma.organization.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        timezone: true,
        services: {
          where: { active: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            durationMin: true
          }
        }
      }
    });

    if (!organization) {
      throw new AppError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found");
    }

    return organization;
  });

  app.post(
    "/api/public/organizations/:slug/leads",
    {
      config: {
        rateLimit: options.publicRateLimit
      }
    },
    async (request, reply) => {
      const { slug } = OrganizationSlugParamsSchema.parse(request.params);
      const organization = await options.prisma.organization.findUnique({
        where: { slug },
        select: { id: true }
      });
      if (!organization) {
        throw new AppError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found");
      }

      const lead = await options.leadService.createLead(organization.id, request.body);
      await options.notificationService.notifyOrganization({
        organizationId: organization.id,
        type: "lead_created",
        subject: `New lead from ${lead.customer.name}`,
        body: `${lead.customer.name} submitted a new lead. Review it in LeadPilot AI.`
      });
      await options.auditService.record({
        organizationId: organization.id,
        action: "lead.created",
        entityType: "Lead",
        entityId: lead.id,
        metadata: { source: "public_org_page", organizationSlug: slug, customer: lead.customer.name }
      });
      return reply.status(201).send(lead);
    }
  );
};
