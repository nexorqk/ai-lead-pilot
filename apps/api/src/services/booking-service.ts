import type { BookingStatus, PrismaClient } from "@prisma/client";
import { CreateLeadBookingInputSchema, UpdateAvailabilityRulesInputSchema, type AvailabilityRuleInput } from "@leadpilot/shared";
import { AppError } from "../utils/errors.js";

export class BookingService {
  constructor(private readonly prisma: PrismaClient) {}

  async listBookings(organizationId: string) {
    return this.prisma.booking.findMany({
      where: { organizationId },
      orderBy: { startsAt: "asc" },
      include: {
        customer: true,
        service: true,
        lead: {
          include: {
            messages: { orderBy: { createdAt: "asc" }, take: 1 }
          }
        }
      }
    });
  }

  async upcomingBookings(organizationId: string, take = 5) {
    return this.prisma.booking.findMany({
      where: {
        organizationId,
        startsAt: { gte: new Date() },
        status: { in: ["requested", "confirmed"] }
      },
      orderBy: { startsAt: "asc" },
      take,
      include: {
        customer: true,
        service: true,
        lead: true
      }
    });
  }

  async createFromLead(organizationId: string, leadId: string, rawInput: unknown) {
    const input = CreateLeadBookingInputSchema.parse(rawInput);
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, organizationId },
      include: { service: true, customer: true }
    });
    if (!lead) {
      throw new AppError(404, "LEAD_NOT_FOUND", "Lead was not found");
    }

    const service = input.serviceId
      ? await this.prisma.service.findFirst({ where: { id: input.serviceId, organizationId, active: true } })
      : lead.service;
    const durationMin = service?.durationMin ?? 60;
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(startsAt.getTime() + durationMin * 60 * 1000);

    await this.ensureInsideAvailability(organizationId, startsAt, endsAt);
    await this.ensureNoOverlap(organizationId, startsAt, endsAt);

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          organizationId,
          customerId: lead.customerId,
          leadId: lead.id,
          serviceId: service?.id,
          startsAt,
          endsAt,
          status: input.status as BookingStatus,
          notes: input.notes || null
        },
        include: {
          customer: true,
          service: true,
          lead: true
        }
      });

      if (booking.status === "confirmed") {
        await tx.lead.update({
          where: { id: lead.id },
          data: { status: "booked" }
        });
      }

      return booking;
    });
  }

  async updateStatus(organizationId: string, bookingId: string, status: BookingStatus) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, organizationId }
    });
    if (!booking) {
      throw new AppError(404, "BOOKING_NOT_FOUND", "Booking was not found");
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: { status },
        include: { customer: true, service: true, lead: true }
      });

      if (updated.leadId && status === "confirmed") {
        await tx.lead.update({ where: { id: updated.leadId }, data: { status: "booked" } });
      }

      return updated;
    });
  }

  async availabilityRules(organizationId: string) {
    return this.prisma.availabilityRule.findMany({
      where: { organizationId, active: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }]
    });
  }

  async updateAvailabilityRules(organizationId: string, rawInput: unknown) {
    const input = UpdateAvailabilityRulesInputSchema.parse(rawInput);
    this.ensureUniqueAvailabilityRules(input.rules);

    return this.prisma.$transaction(async (tx) => {
      await tx.availabilityRule.updateMany({
        where: { organizationId, active: true },
        data: { active: false }
      });

      for (const rule of input.rules) {
        await tx.availabilityRule.upsert({
          where: {
            organizationId_dayOfWeek_startTime_endTime: {
              organizationId,
              dayOfWeek: rule.dayOfWeek,
              startTime: rule.startTime,
              endTime: rule.endTime
            }
          },
          update: { active: true },
          create: {
            organizationId,
            dayOfWeek: rule.dayOfWeek,
            startTime: rule.startTime,
            endTime: rule.endTime,
            active: true
          }
        });
      }

      return tx.availabilityRule.findMany({
        where: { organizationId, active: true },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }]
      });
    });
  }

  private ensureUniqueAvailabilityRules(rules: AvailabilityRuleInput[]) {
    const keys = new Set<string>();
    for (const rule of rules) {
      const key = `${rule.dayOfWeek}:${rule.startTime}:${rule.endTime}`;
      if (keys.has(key)) {
        throw new AppError(400, "DUPLICATE_AVAILABILITY_RULE", "Availability rules must be unique");
      }
      keys.add(key);
    }
  }

  private async ensureInsideAvailability(organizationId: string, startsAt: Date, endsAt: Date) {
    const dayOfWeek = startsAt.getUTCDay();
    const rules = await this.prisma.availabilityRule.findMany({
      where: { organizationId, dayOfWeek, active: true }
    });

    if (!rules.length) {
      throw new AppError(422, "OUTSIDE_AVAILABILITY", "No availability is configured for this day");
    }

    const startMinutes = startsAt.getUTCHours() * 60 + startsAt.getUTCMinutes();
    const endMinutes = endsAt.getUTCHours() * 60 + endsAt.getUTCMinutes();
    const withinRule = rules.some((rule) => {
      const ruleStart = toMinutes(rule.startTime);
      const ruleEnd = toMinutes(rule.endTime);
      return startMinutes >= ruleStart && endMinutes <= ruleEnd;
    });

    if (!withinRule) {
      throw new AppError(422, "OUTSIDE_AVAILABILITY", "Booking time is outside configured availability");
    }
  }

  private async ensureNoOverlap(organizationId: string, startsAt: Date, endsAt: Date) {
    const overlap = await this.prisma.booking.findFirst({
      where: {
        organizationId,
        status: { in: ["requested", "confirmed"] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt }
      }
    });

    if (overlap) {
      throw new AppError(409, "BOOKING_CONFLICT", "Booking overlaps an existing requested or confirmed booking");
    }
  }
}

function toMinutes(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}
