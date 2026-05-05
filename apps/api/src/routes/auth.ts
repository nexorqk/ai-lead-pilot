import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { PasswordSetupInputSchema, PasswordSetupTokenParamsSchema } from "@leadpilot/shared";
import type { AuthService } from "../services/auth-service.js";
import { completePasswordSetup, previewPasswordSetup } from "../services/password-setup-service.js";

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
};
