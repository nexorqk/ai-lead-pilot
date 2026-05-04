import type { FastifyPluginAsync } from "fastify";
import type { AuthService } from "../services/auth-service.js";

export const authRoutes: FastifyPluginAsync<{
  authService: AuthService;
  cookieName: string;
  sessionTtlDays: number;
  production: boolean;
}> = async (app, options) => {
  app.post("/api/auth/login", async (request, reply) => {
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
  });

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
          role: context.role
        }
      }
    };
  });
};
