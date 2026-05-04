import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export function sendError(request: FastifyRequest, reply: FastifyReply, error: unknown, production: boolean) {
  const requestId = request.id;
  const statusCode = typeof (error as { statusCode?: unknown }).statusCode === "number" ? (error as { statusCode: number }).statusCode : undefined;
  const code = typeof (error as { code?: unknown }).code === "string" ? (error as { code: string }).code : undefined;

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId
      }
    });
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.flatten(),
        requestId
      }
    });
  }

  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return reply.status(statusCode).send({
      error: {
        code: code ?? "REQUEST_ERROR",
        message: error instanceof Error ? error.message : "Request failed",
        requestId
      }
    });
  }

  return reply.status(500).send({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error",
      details: production ? undefined : error instanceof Error ? error.message : String(error),
      requestId
    }
  });
}
