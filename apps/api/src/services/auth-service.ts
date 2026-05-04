import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { PrismaClient, UserRole } from "@prisma/client";
import { LoginInputSchema } from "@leadpilot/shared";
import { AppError } from "../utils/errors.js";

export type AuthenticatedContext = {
  userId: string;
  email: string;
  name: string;
  organizationId: string;
  organizationName: string;
  role: UserRole;
};

export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly sessionTtlDays: number
  ) {}

  async login(rawInput: unknown) {
    const input = LoginInputSchema.parse(rawInput);
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        memberships: {
          include: { organization: true },
          orderBy: { createdAt: "asc" },
          take: 1
        }
      }
    });

    if (!user?.passwordHash) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const membership = user.memberships[0];
    if (!membership) {
      throw new AppError(403, "NO_ORGANIZATION_MEMBERSHIP", "User is not assigned to an organization");
    }

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + this.sessionTtlDays * 24 * 60 * 60 * 1000);
    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashSessionToken(token),
        expiresAt
      }
    });

    return {
      token,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organization: {
          id: membership.organization.id,
          name: membership.organization.name,
          role: membership.role
        }
      }
    };
  }

  async getContextFromToken(token?: string): Promise<AuthenticatedContext> {
    if (!token) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: {
        user: {
          include: {
            memberships: {
              include: { organization: true },
              orderBy: { createdAt: "asc" },
              take: 1
            }
          }
        }
      }
    });

    if (!session || session.expiresAt <= new Date()) {
      if (session) {
        await this.prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      }
      throw new AppError(401, "SESSION_EXPIRED", "Session expired");
    }

    const membership = session.user.memberships[0];
    if (!membership) {
      throw new AppError(403, "NO_ORGANIZATION_MEMBERSHIP", "User is not assigned to an organization");
    }

    return {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
      organizationId: membership.organizationId,
      organizationName: membership.organization.name,
      role: membership.role
    };
  }

  async logout(token?: string) {
    if (!token) return;
    await this.prisma.session.delete({ where: { tokenHash: hashSessionToken(token) } }).catch(() => undefined);
  }
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function requireRole(context: AuthenticatedContext, allowedRoles: UserRole[]) {
  if (!allowedRoles.includes(context.role)) {
    throw new AppError(403, "FORBIDDEN", "You do not have permission to perform this action");
  }
}
