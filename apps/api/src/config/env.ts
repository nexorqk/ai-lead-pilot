import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  SESSION_SECRET: z.string().min(32).default("development_session_secret_change_me_32"),
  SESSION_COOKIE_NAME: z.string().default("leadpilot_session"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  PUBLIC_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  PUBLIC_RATE_LIMIT_WINDOW: z.string().default("1 minute"),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  AUTH_RATE_LIMIT_WINDOW: z.string().default("1 minute"),
  DEMO_ORGANIZATION_ID: z.string().optional(),
  AI_PROVIDER: z.enum(["mock", "openai"]).default("mock"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini")
});

export const env = EnvSchema.parse(process.env);
