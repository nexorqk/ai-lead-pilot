import { Queue } from "bullmq";
import { Redis } from "ioredis";
import type { LeadAnalysisQueueJob, NotificationQueueJob } from "@leadpilot/shared";

export const leadAnalysisQueueName = "lead-analysis";
export const notificationQueueName = "notifications";

export function createLeadAnalysisQueue(redisUrl: string) {
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  return new Queue<LeadAnalysisQueueJob>(leadAnalysisQueueName, { connection });
}

export function createNotificationQueue(redisUrl: string) {
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  return new Queue<NotificationQueueJob>(notificationQueueName, { connection });
}
