import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { prisma } from "@leadpilot/database";
import { createLeadAnalysisProvider } from "@leadpilot/ai";
import { env } from "./config/env.js";
import { LeadService } from "./services/lead-service.js";
import { AuthService } from "./services/auth-service.js";
import { sendError } from "./utils/errors.js";
import { healthRoutes } from "./routes/health.js";
import { leadRoutes } from "./routes/leads.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { authRoutes } from "./routes/auth.js";
import { createLeadAnalysisQueue } from "./queue/lead-analysis-queue.js";

const app = Fastify({
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
const analysisQueueResources = env.REDIS_URL ? createLeadAnalysisQueue(env.REDIS_URL) : undefined;

app.register(cors, {
  origin: env.NODE_ENV === "production" ? env.WEB_ORIGIN : true,
  credentials: true
});
app.register(cookie, {
  secret: env.SESSION_SECRET
});

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  return sendError(reply, error, env.NODE_ENV === "production");
});

await app.register(healthRoutes, { prisma, redisUrl: env.REDIS_URL });
await app.register(authRoutes, {
  authService,
  cookieName: env.SESSION_COOKIE_NAME,
  sessionTtlDays: env.SESSION_TTL_DAYS,
  production: env.NODE_ENV === "production"
});
await app.register(leadRoutes, {
  leadService,
  authService,
  prisma,
  analysisQueue: analysisQueueResources?.queue,
  cookieName: env.SESSION_COOKIE_NAME,
  configuredDemoOrganizationId: env.DEMO_ORGANIZATION_ID
});
await app.register(dashboardRoutes, {
  leadService,
  authService,
  prisma,
  cookieName: env.SESSION_COOKIE_NAME
});

const shutdown = async () => {
  app.log.info("Shutting down API");
  await app.close();
  await analysisQueueResources?.queue.close();
  await analysisQueueResources?.connection.quit();
  await prisma.$disconnect();
};

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

await app.listen({ host: env.API_HOST, port: env.API_PORT });
