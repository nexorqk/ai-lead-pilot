import type { PrismaClient } from "@prisma/client";
import { AppError } from "../utils/errors.js";

export async function getDemoOrganizationId(prisma: PrismaClient, configuredId?: string) {
  if (configuredId) {
    const organization = await prisma.organization.findUnique({ where: { id: configuredId } });
    if (!organization) {
      throw new AppError(500, "DEMO_ORGANIZATION_NOT_FOUND", "Configured demo organization was not found");
    }
    return organization.id;
  }

  const organization = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (!organization) {
    throw new AppError(503, "NO_ORGANIZATION", "No organization exists. Run database seed first.");
  }
  return organization.id;
}
