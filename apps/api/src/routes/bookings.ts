import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { BookingStatusSchema, LeadIdParamsSchema } from "@leadpilot/shared";
import { requireRole, type AuthService } from "../services/auth-service.js";
import type { BookingService } from "../services/booking-service.js";
import type { NotificationService } from "../services/notification-service.js";
import type { AuditService } from "../services/audit-service.js";

const BookingIdParamsSchema = z.object({ id: z.string().cuid() });
const UpdateBookingStatusSchema = z.object({ status: BookingStatusSchema });

export const bookingRoutes: FastifyPluginAsync<{
  bookingService: BookingService;
  notificationService: NotificationService;
  auditService: AuditService;
  authService: AuthService;
  cookieName: string;
}> = async (app, options) => {
  app.get("/api/bookings", async (request) => {
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    return options.bookingService.listBookings(context.organizationId);
  });

  app.get("/api/bookings/upcoming", async (request) => {
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    return options.bookingService.upcomingBookings(context.organizationId);
  });

  app.get("/api/availability", async (request) => {
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    return options.bookingService.availabilityRules(context.organizationId);
  });

  app.patch("/api/availability", async (request) => {
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    requireRole(context, ["owner"]);
    const rules = await options.bookingService.updateAvailabilityRules(context.organizationId, request.body);
    await options.auditService.record({
      organizationId: context.organizationId,
      actorUserId: context.userId,
      action: "availability.updated",
      entityType: "Organization",
      entityId: context.organizationId,
      metadata: { ruleCount: rules.length }
    });
    return rules;
  });

  app.post("/api/leads/:id/bookings", async (request, reply) => {
    const { id } = LeadIdParamsSchema.parse(request.params);
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    requireRole(context, ["owner", "manager", "staff"]);
    const booking = await options.bookingService.createFromLead(context.organizationId, id, request.body);
    await options.notificationService.notifyOrganization({
      organizationId: context.organizationId,
      type: "booking_created",
      subject: `Booking ${booking.status} for ${booking.customer.name}`,
      body: `${booking.customer.name} has a ${booking.status} booking at ${booking.startsAt.toISOString()}.`
    });
    if (booking.customer.email) {
      await options.notificationService.notifyRecipient({
        organizationId: context.organizationId,
        type: "booking_created_customer",
        channel: "mock_email",
        recipient: booking.customer.email,
        subject: "Your booking request was received",
        body: `Your booking is ${booking.status} for ${booking.startsAt.toISOString()}.`
      });
    }
    await options.auditService.record({
      organizationId: context.organizationId,
      actorUserId: context.userId,
      action: "booking.created",
      entityType: "Booking",
      entityId: booking.id,
      metadata: { leadId: id, status: booking.status }
    });
    return reply.status(201).send(booking);
  });

  app.patch("/api/bookings/:id/status", async (request) => {
    const { id } = BookingIdParamsSchema.parse(request.params);
    const { status } = UpdateBookingStatusSchema.parse(request.body);
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    requireRole(context, ["owner", "manager", "staff"]);
    const booking = await options.bookingService.updateStatus(context.organizationId, id, status);
    await options.notificationService.notifyOrganization({
      organizationId: context.organizationId,
      type: "booking_status_changed",
      subject: `Booking status changed to ${booking.status}`,
      body: `${booking.customer.name}'s booking is now ${booking.status}.`
    });
    if (booking.customer.email) {
      await options.notificationService.notifyRecipient({
        organizationId: context.organizationId,
        type: "booking_status_changed_customer",
        channel: "mock_email",
        recipient: booking.customer.email,
        subject: `Booking ${booking.status}`,
        body: `Your booking status is now ${booking.status}.`
      });
    }
    await options.auditService.record({
      organizationId: context.organizationId,
      actorUserId: context.userId,
      action: "booking.status_changed",
      entityType: "Booking",
      entityId: booking.id,
      metadata: { status: booking.status }
    });
    return booking;
  });
};
