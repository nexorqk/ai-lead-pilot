import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient, Prisma } from "@prisma/client";
import { ResetPasswordInputSchema, ResetPasswordPreviewSchema } from "@leadpilot/shared";
import { AppError } from "../utils/errors.js";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export async function issuePasswordResetToken(prisma: PrismaLike, userId: string, ttlHours: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  await prisma.passwordResetToken.upsert({
    where: { userId },
    update: {
      tokenHash: hashPasswordResetToken(token),
      expiresAt,
      usedAt: null
    },
    create: {
      userId,
      tokenHash: hashPasswordResetToken(token),
      expiresAt
    }
  });

  return { token, expiresAt };
}

export async function previewPasswordReset(prisma: PrismaClient, token: string) {
  const tokenRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashPasswordResetToken(token) },
    include: { user: true }
  });

  if (!tokenRecord) {
    throw new AppError(404, "PASSWORD_RESET_TOKEN_NOT_FOUND", "Password reset link not found");
  }

  assertPasswordResetTokenValid(tokenRecord.expiresAt, tokenRecord.usedAt);

  return ResetPasswordPreviewSchema.parse({
    email: tokenRecord.user.email,
    name: tokenRecord.user.name,
    expiresAt: tokenRecord.expiresAt.toISOString()
  });
}

export async function completePasswordReset(prisma: PrismaClient, rawInput: unknown) {
  const input = ResetPasswordInputSchema.parse(rawInput);
  const tokenHash = hashPasswordResetToken(input.token);
  const now = new Date();

  const tokenRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (!tokenRecord) {
    throw new AppError(404, "PASSWORD_RESET_TOKEN_NOT_FOUND", "Password reset link not found");
  }

  assertPasswordResetTokenValid(tokenRecord.expiresAt, tokenRecord.usedAt);

  const passwordHash = await bcrypt.hash(input.password, 12);

  await prisma.$transaction(async (tx) => {
    const current = await tx.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!current) {
      throw new AppError(404, "PASSWORD_RESET_TOKEN_NOT_FOUND", "Password reset link not found");
    }

    assertPasswordResetTokenValid(current.expiresAt, current.usedAt);

    await tx.user.update({
      where: { id: current.userId },
      data: { passwordHash }
    });

    await tx.passwordResetToken.update({
      where: { id: current.id },
      data: { usedAt: now }
    });

    await tx.session.deleteMany({
      where: { userId: current.userId }
    });
  });

  return {
    ok: true,
    email: tokenRecord.user.email
  };
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function assertPasswordResetTokenValid(expiresAt: Date, usedAt: Date | null) {
  if (usedAt) {
    throw new AppError(410, "PASSWORD_RESET_TOKEN_USED", "Password reset link has already been used");
  }

  if (expiresAt <= new Date()) {
    throw new AppError(410, "PASSWORD_RESET_TOKEN_EXPIRED", "Password reset link has expired");
  }
}
