import { Worker } from "bullmq";
import { Redis } from "ioredis";
import pino from "pino";
import { prisma } from "@leadpilot/database";
import { createLeadAnalysisProvider } from "@leadpilot/ai";
import { LeadAnalysisQueueJobSchema, NotificationQueueJobSchema } from "@leadpilot/shared";
import { leadAnalysisQueueName, notificationQueueName } from "./queue.js";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const aiProvider = createLeadAnalysisProvider({
  provider: process.env.AI_PROVIDER === "openai" ? "openai" : "mock",
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini"
});

const worker = new Worker(
  leadAnalysisQueueName,
  async (job) => {
    const data = LeadAnalysisQueueJobSchema.parse(job.data);
    await prisma.leadAiAnalysisJob.update({
      where: { id: data.analysisJobId },
      data: { status: "processing", startedAt: new Date(), error: null, bullmqJobId: job.id }
    });

    const lead = await prisma.lead.findFirst({
      where: { id: data.leadId, organizationId: data.organizationId },
      include: {
        customer: true,
        service: true,
        messages: { orderBy: { createdAt: "asc" }, take: 1 }
      }
    });
    if (!lead || !lead.messages[0]) {
      throw new Error("Lead was not found or has no message");
    }

    const analysis = await aiProvider.analyze({
      customerName: lead.customer.name,
      customerEmail: lead.customer.email,
      customerPhone: lead.customer.phone,
      message: lead.messages[0].body,
      serviceName: lead.service?.name,
      preferredDate: lead.preferredDate,
      preferredTime: lead.preferredTime
    });

    await prisma.$transaction(async (tx) => {
      await tx.leadAiAnalysis.create({
        data: {
          leadId: lead.id,
          provider: "worker-mock",
          intent: analysis.intent,
          service: analysis.service,
          urgency: analysis.urgency,
          budget: analysis.budget,
          leadQuality: analysis.leadQuality,
          missingFields: analysis.missingFields,
          summary: analysis.summary,
          nextAction: analysis.nextAction,
          confidence: analysis.confidence
        }
      });
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          quality: analysis.leadQuality,
          status: analysis.leadQuality === "cold" ? "new" : "qualified"
        }
      });
      await tx.leadAiAnalysisJob.update({
        where: { id: data.analysisJobId },
        data: { status: "completed", completedAt: new Date(), error: null }
      });
    });

    return { leadId: lead.id, analysisJobId: data.analysisJobId };
  },
  { connection }
);

const notificationWorker = new Worker(
  notificationQueueName,
  async (job) => {
    const data = NotificationQueueJobSchema.parse(job.data);
    const notification = await prisma.notification.findFirst({
      where: { id: data.notificationId, organizationId: data.organizationId }
    });
    if (!notification) {
      throw new Error("Notification was not found");
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: { attempts: { increment: 1 }, error: null }
    });

    logger.info(
      {
        notificationId: notification.id,
        channel: notification.channel,
        recipient: notification.recipient,
        subject: notification.subject
      },
      "Mock notification sent"
    );

    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: "sent", sentAt: new Date(), error: null }
    });

    return { notificationId: notification.id };
  },
  { connection }
);

worker.on("ready", () => logger.info({ queue: leadAnalysisQueueName }, "Worker ready"));
worker.on("completed", (job) => logger.info({ jobId: job.id }, "Lead analysis completed"));
worker.on("failed", (job, error) => {
  const parsed = LeadAnalysisQueueJobSchema.safeParse(job?.data);
  if (parsed.success) {
    void prisma.leadAiAnalysisJob
      .update({
        where: { id: parsed.data.analysisJobId },
        data: {
          status: "failed",
          completedAt: new Date(),
          error: error instanceof Error ? error.message : String(error)
        }
      })
      .catch((updateError) => logger.error({ updateError }, "Failed to record analysis job failure"));
  }
  logger.error({ jobId: job?.id, error }, "Lead analysis failed");
});

notificationWorker.on("ready", () => logger.info({ queue: notificationQueueName }, "Notification worker ready"));
notificationWorker.on("completed", (job) => logger.info({ jobId: job.id }, "Notification completed"));
notificationWorker.on("failed", (job, error) => {
  const parsed = NotificationQueueJobSchema.safeParse(job?.data);
  if (parsed.success) {
    void prisma.notification
      .update({
        where: { id: parsed.data.notificationId },
        data: {
          status: "failed",
          attempts: { increment: 1 },
          error: error instanceof Error ? error.message : String(error)
        }
      })
      .catch((updateError) => logger.error({ updateError }, "Failed to record notification failure"));
  }
  logger.error({ jobId: job?.id, error }, "Notification failed");
});

async function shutdown() {
  logger.info("Shutting down worker");
  await worker.close();
  await notificationWorker.close();
  await connection.quit();
  await prisma.$disconnect();
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
