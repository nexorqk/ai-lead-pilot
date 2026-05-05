import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient, Prisma } from "@prisma/client";
import { PasswordSetupInputSchema, PasswordSetupPreviewSchema } from "@leadpilot/shared";
import { AppError } from "../utils/errors.js";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export async function issuePasswordSetupToken(prisma: PrismaLike, organizationMemberId: string, ttlDays: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await prisma.passwordSetupToken.upsert({
    where: { organizationMemberId },
    update: {
      tokenHash: hashPasswordSetupToken(token),
      expiresAt,
      usedAt: null
    },
    create: {
      organizationMemberId,
      tokenHash: hashPasswordSetupToken(token),
      expiresAt
    }
  });

  return { token, expiresAt };
}

export async function previewPasswordSetup(prisma: PrismaClient, token: string) {
  const tokenRecord = await prisma.passwordSetupToken.findUnique({
    where: { tokenHash: hashPasswordSetupToken(token) },
    include: {
      organizationMember: {
        include: {
          user: true,
          organization: true
        }
      }
    }
  });

  if (!tokenRecord) {
    throw new AppError(404, "PASSWORD_SETUP_TOKEN_NOT_FOUND", "Password setup link not found");
  }

  assertPasswordSetupTokenValid(tokenRecord.expiresAt, tokenRecord.usedAt);

  return PasswordSetupPreviewSchema.parse({
    email: tokenRecord.organizationMember.user.email,
    name: tokenRecord.organizationMember.user.name,
    organizationName: tokenRecord.organizationMember.organization.name,
    expiresAt: tokenRecord.expiresAt.toISOString()
  });
}

export async function completePasswordSetup(prisma: PrismaClient, rawInput: unknown) {
  const input = PasswordSetupInputSchema.parse(rawInput);
  const tokenHash = hashPasswordSetupToken(input.token);
  const now = new Date();

  const tokenRecord = await prisma.passwordSetupToken.findUnique({
    where: { tokenHash },
    include: {
      organizationMember: {
        include: {
          user: true,
          organization: true
        }
      }
    }
  });

  if (!tokenRecord) {
    throw new AppError(404, "PASSWORD_SETUP_TOKEN_NOT_FOUND", "Password setup link not found");
  }

  assertPasswordSetupTokenValid(tokenRecord.expiresAt, tokenRecord.usedAt);

  if (tokenRecord.organizationMember.user.passwordHash) {
    throw new AppError(409, "PASSWORD_ALREADY_SET", "Password has already been set for this account");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  await prisma.$transaction(async (tx) => {
    const current = await tx.passwordSetupToken.findUnique({
      where: { tokenHash },
      include: {
        organizationMember: {
          include: {
            user: true
          }
        }
      }
    });

    if (!current) {
      throw new AppError(404, "PASSWORD_SETUP_TOKEN_NOT_FOUND", "Password setup link not found");
    }

    assertPasswordSetupTokenValid(current.expiresAt, current.usedAt);

    if (current.organizationMember.user.passwordHash) {
      throw new AppError(409, "PASSWORD_ALREADY_SET", "Password has already been set for this account");
    }

    await tx.user.update({
      where: { id: current.organizationMember.userId },
      data: { passwordHash }
    });

    await tx.passwordSetupToken.update({
      where: { id: current.id },
      data: { usedAt: now }
    });
  });

  return {
    ok: true,
    email: tokenRecord.organizationMember.user.email,
    organizationName: tokenRecord.organizationMember.organization.name
  };
}

export function hashPasswordSetupToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function assertPasswordSetupTokenValid(expiresAt: Date, usedAt: Date | null) {
  if (usedAt) {
    throw new AppError(410, "PASSWORD_SETUP_TOKEN_USED", "Password setup link has already been used");
  }

  if (expiresAt <= new Date()) {
    throw new AppError(410, "PASSWORD_SETUP_TOKEN_EXPIRED", "Password setup link has expired");
  }
}
