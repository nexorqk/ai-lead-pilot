import type { PrismaClient } from "@prisma/client";

export class AuditService {
  constructor(private readonly prisma: PrismaClient) {}

  async record(input: {
    organizationId: string;
    actorUserId?: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: unknown;
  }) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata === undefined ? undefined : JSON.parse(JSON.stringify(input.metadata))
      }
    });
  }

  async list(organizationId: string) {
    return this.prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { actor: true }
    });
  }
}
