import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { BookingStatusSchema, LeadIdParamsSchema } from "@leadpilot/shared";
import { requireRole, type AuthService } from "../services/auth-service.js";
import type { BookingService } from "../services/booking-service.js";

const BookingIdParamsSchema = z.object({ id: z.string().cuid() });
const UpdateBookingStatusSchema = z.object({ status: BookingStatusSchema });

export const bookingRoutes: FastifyPluginAsync<{
  bookingService: BookingService;
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

  app.post("/api/leads/:id/bookings", async (request, reply) => {
    const { id } = LeadIdParamsSchema.parse(request.params);
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    requireRole(context, ["owner", "manager", "staff"]);
    const booking = await options.bookingService.createFromLead(context.organizationId, id, request.body);
    return reply.status(201).send(booking);
  });

  app.patch("/api/bookings/:id/status", async (request) => {
    const { id } = BookingIdParamsSchema.parse(request.params);
    const { status } = UpdateBookingStatusSchema.parse(request.body);
    const context = await options.authService.getContextFromToken(request.cookies[options.cookieName]);
    requireRole(context, ["owner", "manager", "staff"]);
    return options.bookingService.updateStatus(context.organizationId, id, status);
  });
};
