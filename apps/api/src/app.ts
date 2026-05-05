import crypto from "node:crypto";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { PrismaClient } from "@prisma/client";
import { createLeadAnalysisProvider } from "@leadpilot/ai";
import { LeadService } from "./services/lead-service.js";
import { AuthService } from "./services/auth-service.js";
import { BookingService } from "./services/booking-service.js";
import { AuditService } from "./services/audit-service.js";
import { NotificationService } from "./services/notification-service.js";
import { TeamService } from "./services/team-service.js";
import { sendError } from "./utils/errors.js";
import { healthRoutes } from "./routes/health.js";
import { leadRoutes } from "./routes/leads.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { authRoutes } from "./routes/auth.js";
import { bookingRoutes } from "./routes/bookings.js";
import { notificationRoutes } from "./routes/notifications.js";
import { teamRoutes } from "./routes/team.js";
import { publicRoutes } from "./routes/public.js";
import { createLeadAnalysisQueue } from "./queue/lead-analysis-queue.js";
import { createNotificationQueue } from "./queue/notification-queue.js";

export type AppConfig = {
  NODE_ENV: "development" | "test" | "production";
  LOG_LEVEL: string;
  REDIS_URL?: string;
  WEB_ORIGIN: string;
  SESSION_SECRET: string;
  SESSION_COOKIE_NAME: string;
  SESSION_TTL_DAYS: number;
  PUBLIC_RATE_LIMIT_MAX: number;
  PUBLIC_RATE_LIMIT_WINDOW: string;
  AUTH_RATE_LIMIT_MAX: number;
  AUTH_RATE_LIMIT_WINDOW: string;
  DEMO_ORGANIZATION_ID?: string;
  AI_PROVIDER: "mock" | "openai";
  OPENAI_API_KEY?: string;
  OPENAI_MODEL: string;
};

export async function buildApp(config: AppConfig, prisma: PrismaClient) {
  const app = Fastify({
    genReqId: (request) => {
      const incoming = request.headers["x-request-id"];
      return typeof incoming === "string" && incoming.length <= 128 ? incoming : crypto.randomUUID();
    },
    logger:
      config.NODE_ENV === "test"
        ? false
        : {
            level: config.LOG_LEVEL,
            redact: ["req.headers.authorization", "req.headers.cookie"]
          }
  });

  const aiProvider = createLeadAnalysisProvider({
    provider: config.AI_PROVIDER,
    openAiApiKey: config.OPENAI_API_KEY,
    openAiModel: config.OPENAI_MODEL
  });
  const leadService = new LeadService(prisma, aiProvider);
  const authService = new AuthService(prisma, config.SESSION_TTL_DAYS);
  const bookingService = new BookingService(prisma);
  const auditService = new AuditService(prisma);
  const teamService = new TeamService(prisma, config.SESSION_TTL_DAYS);
  const analysisQueueResources = config.REDIS_URL ? createLeadAnalysisQueue(config.REDIS_URL) : undefined;
  const notificationQueueResources = config.REDIS_URL ? createNotificationQueue(config.REDIS_URL) : undefined;
  const notificationService = new NotificationService(prisma, notificationQueueResources?.queue);

  app.register(cors, {
    origin: config.NODE_ENV === "production" ? config.WEB_ORIGIN : true,
    credentials: true
  });
  app.register(helmet, {
    contentSecurityPolicy: false
  });
  app.register(rateLimit, {
    global: false
  });
  app.register(cookie, {
    secret: config.SESSION_SECRET
  });

  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    return sendError(request, reply, error, config.NODE_ENV === "production");
  });

  await app.register(healthRoutes, { prisma, redisUrl: config.REDIS_URL });
  await app.register(authRoutes, {
    authService,
    prisma,
    cookieName: config.SESSION_COOKIE_NAME,
    sessionTtlDays: config.SESSION_TTL_DAYS,
    production: config.NODE_ENV === "production",
    rateLimit: {
      max: config.AUTH_RATE_LIMIT_MAX,
      timeWindow: config.AUTH_RATE_LIMIT_WINDOW
    }
  });
  await app.register(leadRoutes, {
    leadService,
    notificationService,
    auditService,
    authService,
    prisma,
    analysisQueue: analysisQueueResources?.queue,
    cookieName: config.SESSION_COOKIE_NAME,
    configuredDemoOrganizationId: config.DEMO_ORGANIZATION_ID,
    publicRateLimit: {
      max: config.PUBLIC_RATE_LIMIT_MAX,
      timeWindow: config.PUBLIC_RATE_LIMIT_WINDOW
    }
  });
  await app.register(publicRoutes, {
    prisma,
    leadService,
    notificationService,
    auditService,
    publicRateLimit: {
      max: config.PUBLIC_RATE_LIMIT_MAX,
      timeWindow: config.PUBLIC_RATE_LIMIT_WINDOW
    }
  });
  await app.register(dashboardRoutes, {
    leadService,
    bookingService,
    authService,
    cookieName: config.SESSION_COOKIE_NAME
  });
  await app.register(bookingRoutes, {
    bookingService,
    notificationService,
    auditService,
    authService,
    cookieName: config.SESSION_COOKIE_NAME
  });
  await app.register(notificationRoutes, {
    authService,
    notificationService,
    auditService,
    cookieName: config.SESSION_COOKIE_NAME
  });
  await app.register(teamRoutes, {
    authService,
    teamService,
    auditService,
    notificationService,
    cookieName: config.SESSION_COOKIE_NAME,
    webOrigin: config.WEB_ORIGIN
  });

  app.addHook("onClose", async () => {
    await analysisQueueResources?.queue.close();
    await analysisQueueResources?.connection.quit();
    await notificationQueueResources?.queue.close();
    await notificationQueueResources?.connection.quit();
  });

  return app;
}
