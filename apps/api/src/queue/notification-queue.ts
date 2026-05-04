import { Queue } from "bullmq";
import { Redis } from "ioredis";
import type { NotificationQueueJob } from "@leadpilot/shared";

export const notificationQueueName = "notifications";

export function createNotificationQueue(redisUrl: string) {
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue<NotificationQueueJob>(notificationQueueName, { connection });
  return { queue, connection };
}
