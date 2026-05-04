import crypto from "node:crypto";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { prisma } from "@leadpilot/database";
import { createLeadAnalysisProvider } from "@leadpilot/ai";
import { env } from "./config/env.js";
import { LeadService } from "./services/lead-service.js";
import { AuthService } from "./services/auth-service.js";
import { BookingService } from "./services/booking-service.js";
import { AuditService } from "./services/audit-service.js";
import { NotificationService } from "./services/notification-service.js";
import { sendError } from "./utils/errors.js";
import { healthRoutes } from "./routes/health.js";
import { leadRoutes } from "./routes/leads.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { authRoutes } from "./routes/auth.js";
import { bookingRoutes } from "./routes/bookings.js";
import { notificationRoutes } from "./routes/notifications.js";
import { createLeadAnalysisQueue } from "./queue/lead-analysis-queue.js";
import { createNotificationQueue } from "./queue/notification-queue.js";

const app = Fastify({
  genReqId: (request) => {
    const incoming = request.headers["x-request-id"];
    return typeof incoming === "string" && incoming.length <= 128 ? incoming : crypto.randomUUID();
  },
  logger: {
    level: env.LOG_LEVEL,
    redact: ["req.headers.authorization", "req.headers.cookie"]
  }
});

const aiProvider = createLeadAnalysisProvider({
  provider: env.AI_PROVIDER,
  openAiApiKey: env.OPENAI_API_KEY,
  openAiModel: env.OPENAI_MODEL
});
const leadService = new LeadService(prisma, aiProvider);
const authService = new AuthService(prisma, env.SESSION_TTL_DAYS);
const bookingService = new BookingService(prisma);
const auditService = new AuditService(prisma);
const analysisQueueResources = env.REDIS_URL ? createLeadAnalysisQueue(env.REDIS_URL) : undefined;
const notificationQueueResources = env.REDIS_URL ? createNotificationQueue(env.REDIS_URL) : undefined;
const notificationService = new NotificationService(prisma, notificationQueueResources?.queue);

app.register(cors, {
  origin: env.NODE_ENV === "production" ? env.WEB_ORIGIN : true,
  credentials: true
});
app.register(helmet, {
  contentSecurityPolicy: false
});
app.register(rateLimit, {
  global: false
});
app.register(cookie, {
  secret: env.SESSION_SECRET
});

app.addHook("onRequest", async (request, reply) => {
  reply.header("x-request-id", request.id);
});

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  return sendError(request, reply, error, env.NODE_ENV === "production");
});

await app.register(healthRoutes, { prisma, redisUrl: env.REDIS_URL });
await app.register(authRoutes, {
  authService,
  cookieName: env.SESSION_COOKIE_NAME,
  sessionTtlDays: env.SESSION_TTL_DAYS,
  production: env.NODE_ENV === "production",
  rateLimit: {
    max: env.AUTH_RATE_LIMIT_MAX,
    timeWindow: env.AUTH_RATE_LIMIT_WINDOW
  }
});
await app.register(leadRoutes, {
  leadService,
  notificationService,
  auditService,
  authService,
  prisma,
  analysisQueue: analysisQueueResources?.queue,
  cookieName: env.SESSION_COOKIE_NAME,
  configuredDemoOrganizationId: env.DEMO_ORGANIZATION_ID,
  publicRateLimit: {
    max: env.PUBLIC_RATE_LIMIT_MAX,
    timeWindow: env.PUBLIC_RATE_LIMIT_WINDOW
  }
});
await app.register(dashboardRoutes, {
  leadService,
  bookingService,
  authService,
  cookieName: env.SESSION_COOKIE_NAME
});
await app.register(bookingRoutes, {
  bookingService,
  notificationService,
  auditService,
  authService,
  cookieName: env.SESSION_COOKIE_NAME
});
await app.register(notificationRoutes, {
  authService,
  notificationService,
  auditService,
  cookieName: env.SESSION_COOKIE_NAME
});

const shutdown = async () => {
  app.log.info("Shutting down API");
  await app.close();
  await analysisQueueResources?.queue.close();
  await analysisQueueResources?.connection.quit();
  await notificationQueueResources?.queue.close();
  await notificationQueueResources?.connection.quit();
  await prisma.$disconnect();
};

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

await app.listen({ host: env.API_HOST, port: env.API_PORT });
