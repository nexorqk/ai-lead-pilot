import type { PrismaClient } from "@prisma/client";
import type { Queue } from "bullmq";
import type { NotificationQueueJob } from "@leadpilot/shared";

export class NotificationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly queue?: Queue<NotificationQueueJob>
  ) {}

  async list(organizationId: string) {
    return this.prisma.notification.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  async preferences(organizationId: string) {
    return this.prisma.notificationPreference.findMany({
      where: { organizationId },
      orderBy: [{ type: "asc" }, { channel: "asc" }]
    });
  }

  async notifyOrganization(input: { organizationId: string; type: string; subject: string; body: string }) {
    const preferences = await this.prisma.notificationPreference.findMany({
      where: {
        organizationId: input.organizationId,
        type: input.type,
        enabled: true
      }
    });

    const notifications = await Promise.all(
      preferences.map((preference) =>
        this.prisma.notification.create({
          data: {
            organizationId: input.organizationId,
            type: input.type,
            channel: preference.channel,
            recipient: preference.recipient,
            subject: input.subject,
            body: input.body
          }
        })
      )
    );

    await Promise.all(notifications.map((notification) => this.enqueue(notification.id, notification.organizationId)));
    return notifications;
  }

  async notifyRecipient(input: {
    organizationId: string;
    type: string;
    channel: string;
    recipient: string;
    subject: string;
    body: string;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        organizationId: input.organizationId,
        type: input.type,
        channel: input.channel,
        recipient: input.recipient,
        subject: input.subject,
        body: input.body
      }
    });
    await this.enqueue(notification.id, notification.organizationId);
    return notification;
  }

  private async enqueue(notificationId: string, organizationId: string) {
    if (!this.queue) return;
    try {
      await this.queue.add(
        "send-notification",
        { notificationId, organizationId },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 250
        }
      );
    } catch (error) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: "failed",
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }
}
