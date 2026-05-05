import type { PrismaClient } from "@prisma/client";
import { UpdateOrganizationProfileInputSchema, type UpdateOrganizationProfileInput } from "@leadpilot/shared";
import { AppError } from "../utils/errors.js";

export class OrganizationService {
  constructor(private readonly prisma: PrismaClient) {}

  async getProfile(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        services: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!organization) {
      throw new AppError(404, "ORGANIZATION_NOT_FOUND", "Organization was not found");
    }

    return organization;
  }

  async updateProfile(organizationId: string, rawInput: unknown) {
    const input = UpdateOrganizationProfileInputSchema.parse(rawInput);
    this.ensureUniqueServiceSlugs(input.services);

    const slugOwner = await this.prisma.organization.findUnique({ where: { slug: input.slug } });
    if (slugOwner && slugOwner.id !== organizationId) {
      throw new AppError(409, "ORGANIZATION_SLUG_TAKEN", "This public page slug is already in use");
    }

    const existingServices = await this.prisma.service.findMany({ where: { organizationId } });
    const existingServiceIds = new Set(existingServices.map((service) => service.id));
    const requestedServiceIds = input.services.flatMap((service) => (service.id ? [service.id] : []));

    for (const serviceId of requestedServiceIds) {
      if (!existingServiceIds.has(serviceId)) {
        throw new AppError(404, "SERVICE_NOT_FOUND", "One of the services does not belong to this organization");
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: organizationId },
        data: {
          name: input.name,
          slug: input.slug,
          timezone: input.timezone
        }
      });

      for (const service of input.services) {
        const serviceData = {
          name: service.name,
          slug: service.slug,
          description: service.description || null,
          durationMin: service.durationMin,
          active: service.active
        };

        if (service.id) {
          await tx.service.update({
            where: { id: service.id },
            data: serviceData
          });
        } else {
          await tx.service.create({
            data: {
              organizationId,
              ...serviceData
            }
          });
        }
      }

      return tx.organization.findUniqueOrThrow({
        where: { id: organizationId },
        include: {
          services: {
            orderBy: { createdAt: "asc" }
          }
        }
      });
    });
  }

  private ensureUniqueServiceSlugs(services: UpdateOrganizationProfileInput["services"]) {
    const slugs = new Set<string>();
    for (const service of services) {
      if (slugs.has(service.slug)) {
        throw new AppError(400, "DUPLICATE_SERVICE_SLUG", "Service slugs must be unique");
      }
      slugs.add(service.slug);
    }
  }
}
