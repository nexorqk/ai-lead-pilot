import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { z } from "zod";

export const leadAnalysisQueueName = "lead-analysis";

export const LeadAnalysisJobSchema = z.object({
  organizationId: z.string().cuid(),
  leadId: z.string().cuid()
});

export type LeadAnalysisJob = z.infer<typeof LeadAnalysisJobSchema>;

export function createLeadAnalysisQueue(redisUrl: string) {
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  return new Queue<LeadAnalysisJob>(leadAnalysisQueueName, { connection });
}
