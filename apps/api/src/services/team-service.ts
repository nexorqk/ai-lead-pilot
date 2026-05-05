import type { PrismaClient, UserRole } from "@prisma/client";
import { TeamMemberInputSchema, UpdateTeamMemberRoleInputSchema } from "@leadpilot/shared";
import { AppError } from "../utils/errors.js";
import { issuePasswordSetupToken } from "./password-setup-service.js";

export class TeamService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly passwordSetupTokenTtlDays: number
  ) {}

  async listMembers(organizationId: string) {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            createdAt: true
          }
        }
      }
    });
    return members.map(toTeamMemberDto);
  }

  async createMember(organizationId: string, rawInput: unknown) {
    const input = TeamMemberInputSchema.parse(rawInput);
    const email = input.email.toLowerCase();

    return this.prisma.$transaction(async (tx) => {
      const existingMember = await tx.organizationMember.findFirst({
        where: {
          organizationId,
          user: { email }
        }
      });
      if (existingMember) {
        throw new AppError(409, "TEAM_MEMBER_EXISTS", "This user is already a member of the organization");
      }

      const user = await tx.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          name: input.name
        }
      });

      const member = await tx.organizationMember.create({
        data: {
          organizationId,
          userId: user.id,
          role: input.role
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              passwordHash: true,
              createdAt: true
            }
          }
        }
      });

      const setupToken =
        member.user.passwordHash ? null : await issuePasswordSetupToken(tx, member.id, this.passwordSetupTokenTtlDays);

      return {
        member: toTeamMemberDto(member),
        passwordSetupToken: setupToken
      };
    });
  }

  async updateMemberRole(organizationId: string, memberId: string, rawInput: unknown) {
    const input = UpdateTeamMemberRoleInputSchema.parse(rawInput);
    const member = await this.getMemberOrThrow(organizationId, memberId);
    await this.ensureOwnerWouldRemain(organizationId, member.role, input.role);

    const updated = await this.prisma.organizationMember.update({
      where: { id: member.id },
      data: { role: input.role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            createdAt: true
          }
        }
      }
    });
    return toTeamMemberDto(updated);
  }

  async removeMember(organizationId: string, memberId: string, actorUserId: string) {
    const member = await this.getMemberOrThrow(organizationId, memberId);
    if (member.userId === actorUserId) {
      throw new AppError(400, "CANNOT_REMOVE_SELF", "Owners cannot remove their own membership");
    }
    await this.ensureOwnerWouldRemain(organizationId, member.role, "viewer");
    await this.prisma.organizationMember.delete({ where: { id: member.id } });
    return { ok: true };
  }

  private async getMemberOrThrow(organizationId: string, memberId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId }
    });
    if (!member) {
      throw new AppError(404, "TEAM_MEMBER_NOT_FOUND", "Team member not found");
    }
    return member;
  }

  private async ensureOwnerWouldRemain(organizationId: string, currentRole: UserRole, nextRole: UserRole) {
    if (currentRole !== "owner" || nextRole === "owner") {
      return;
    }

    const ownerCount = await this.prisma.organizationMember.count({
      where: { organizationId, role: "owner" }
    });
    if (ownerCount <= 1) {
      throw new AppError(400, "LAST_OWNER_REQUIRED", "At least one owner must remain in the organization");
    }
  }
}

function toTeamMemberDto(member: {
  id: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
    passwordHash?: string | null;
    createdAt: Date;
  };
}) {
  return {
    id: member.id,
    role: member.role,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
    user: {
      id: member.user.id,
      email: member.user.email,
      name: member.user.name,
      hasPassword: Boolean(member.user.passwordHash),
      createdAt: member.user.createdAt
    }
  };
}
