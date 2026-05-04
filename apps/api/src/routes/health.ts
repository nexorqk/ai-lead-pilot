import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";

export const healthRoutes: FastifyPluginAsync<{ prisma: PrismaClient; redisUrl?: string }> = async (app, options) => {
  app.get("/health", async () => ({
    status: "ok",
    service: "leadpilot-api",
    uptime: process.uptime()
  }));

  app.get("/ready", async (_request, reply) => {
    const checks: Record<string, string> = {};
    try {
      await options.prisma.$queryRaw`SELECT 1`;
      checks.database = "ok";
    } catch {
      checks.database = "failed";
    }

    if (options.redisUrl) {
      const redis = new Redis(options.redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
      try {
        await redis.connect();
        await redis.ping();
        checks.redis = "ok";
      } catch {
        checks.redis = "failed";
      } finally {
        redis.disconnect();
      }
    } else {
      checks.redis = "skipped";
    }

    const ready = Object.values(checks).every((status) => status === "ok" || status === "skipped");
    return reply.status(ready ? 200 : 503).send({ status: ready ? "ready" : "not_ready", checks });
  });
};
