import { Queue } from "bullmq";
import { Redis } from "ioredis";
import type { LeadAnalysisQueueJob } from "@leadpilot/shared";

export const leadAnalysisQueueName = "lead-analysis";

export function createLeadAnalysisQueue(redisUrl: string) {
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue<LeadAnalysisQueueJob>(leadAnalysisQueueName, { connection });
  return { queue, connection };
}
