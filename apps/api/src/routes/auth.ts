import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { PasswordSetupInputSchema, PasswordSetupTokenParamsSchema, ForgotPasswordInputSchema, ResetPasswordInputSchema, ResetPasswordTokenParamsSchema } from "@leadpilot/shared";
import type { AuthService } from "../services/auth-service.js";
import type { NotificationService } from "../services/notification-service.js";
import { completePasswordSetup, previewPasswordSetup } from "../services/password-setup-service.js";
import { issuePasswordResetToken, previewPasswordReset, completePasswordReset } from "../services/password-reset-service.js";

export const authRoutes: FastifyPluginAsync<{
  authService: AuthService;
  prisma: PrismaClient;
  cookieName: string;
  sessionTtlDays: number;
  production: boolean;
  rateLimit: {
    max: number;
    timeWindow: string;
  };
  notificationService: NotificationService;
  webOrigin: string;
}> = async (app, options) => {
  app.post(
    "/api/auth/login",
    {
      config: {
        rateLimit: options.rateLimit
      }
    },
    async (request, reply) => {
      const result = await options.authService.login(request.body);
      reply.setCookie(options.cookieName, result.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: options.production,
        path: "/",
        maxAge: options.sessionTtlDays * 24 * 60 * 60
      });
      return {
        user: result.user,
        expiresAt: result.expiresAt.toISOString()
      };
    }
  );

  app.post("/api/auth/logout", async (request, reply) => {
    await options.authService.logout(request.cookies[options.cookieName]);
    reply.clearCookie(options.cookieName, { path: "/" });
    return { ok: true };
  });

  app.get("/api/auth/me", async (request) => {
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    return {
      user: {
        id: context.userId,
        email: context.email,
        name: context.name,
        organization: {
          id: context.organizationId,
          name: context.organizationName,
          slug: context.organizationSlug,
          role: context.role
        }
      }
    };
  });

  app.get("/api/auth/password-setup/:token", async (request) => {
    const { token } = PasswordSetupTokenParamsSchema.parse(request.params);
    return previewPasswordSetup(options.prisma, token);
  });

  app.post(
    "/api/auth/password-setup",
    {
      config: {
        rateLimit: options.rateLimit
      }
    },
    async (request) => {
      return completePasswordSetup(options.prisma, PasswordSetupInputSchema.parse(request.body));
    }
  );

  app.post(
    "/api/auth/forgot-password",
    {
      config: {
        rateLimit: options.rateLimit
      }
    },
    async (request) => {
      const { email } = ForgotPasswordInputSchema.parse(request.body);
      const user = await options.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          memberships: {
            include: { organization: true },
            orderBy: { createdAt: "asc" },
            take: 1
          }
        }
      });

      if (user?.passwordHash && user.memberships[0]) {
        const { token, expiresAt } = await issuePasswordResetToken(options.prisma, user.id, 1);
        const resetUrl = new URL(`/reset-password?token=${token}`, options.webOrigin).toString();

        await options.notificationService.notifyRecipient({
          organizationId: user.memberships[0].organizationId,
          type: "password_reset_requested",
          channel: "mock_email",
          recipient: user.email,
          subject: "Reset your LeadPilot AI password",
          body: `Reset your password here: ${resetUrl}\n\nThis link expires at ${expiresAt.toISOString()}.`
        });
      }

      return {
        ok: true,
        message: "If an account exists with this email, a password reset link has been sent."
      };
    }
  );

  app.get("/api/auth/reset-password/:token", async (request) => {
    const { token } = ResetPasswordTokenParamsSchema.parse(request.params);
    return previewPasswordReset(options.prisma, token);
  });

  app.post(
    "/api/auth/reset-password",
    {
      config: {
        rateLimit: options.rateLimit
      }
    },
    async (request) => {
      return completePasswordReset(options.prisma, ResetPasswordInputSchema.parse(request.body));
    }
  );
};
