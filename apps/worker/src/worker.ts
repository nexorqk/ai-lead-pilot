import { Worker } from "bullmq";
import { Redis } from "ioredis";
import pino from "pino";
import { prisma } from "@leadpilot/database";
import { LeadAiAnalysisSchema } from "@leadpilot/shared";
import { LeadAnalysisJobSchema, leadAnalysisQueueName } from "./queue.js";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

const worker = new Worker(
  leadAnalysisQueueName,
  async (job) => {
    const data = LeadAnalysisJobSchema.parse(job.data);
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

    const analysis = LeadAiAnalysisSchema.parse({
      intent: "book_service",
      service: lead.service?.name ?? "consultation",
      urgency: lead.messages[0].body.toLowerCase().includes("today") ? "today" : "this_week",
      budget: "unknown",
      leadQuality: lead.messages[0].body.toLowerCase().includes("urgent") ? "hot" : "warm",
      missingFields: [lead.customer.email ? undefined : "email", lead.customer.phone ? undefined : "phone"].filter(Boolean),
      summary: `${lead.customer.name} asked about ${lead.service?.name ?? "a service"}: ${lead.messages[0].body.slice(0, 220)}`,
      nextAction: "Review the lead and reply with available appointment options.",
      confidence: 0.8
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
        data: { quality: analysis.leadQuality, status: "qualified" }
      });
    });

    return { leadId: lead.id };
  },
  { connection }
);

worker.on("ready", () => logger.info({ queue: leadAnalysisQueueName }, "Worker ready"));
worker.on("completed", (job) => logger.info({ jobId: job.id }, "Lead analysis completed"));
worker.on("failed", (job, error) => logger.error({ jobId: job?.id, error }, "Lead analysis failed"));

async function shutdown() {
  logger.info("Shutting down worker");
  await worker.close();
  await connection.quit();
  await prisma.$disconnect();
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
