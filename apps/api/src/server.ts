import { prisma } from "@leadpilot/database";
import { env } from "./config/env.js";
import { buildApp } from "./app.js";

const app = await buildApp(env, prisma);

const shutdown = async () => {
  app.log.info("Shutting down API");
  await app.close();
  await prisma.$disconnect();
};

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

await app.listen({ host: env.API_HOST, port: env.API_PORT });
