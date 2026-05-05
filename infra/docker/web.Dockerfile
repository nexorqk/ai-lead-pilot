FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
ENV DOCKER_BUILD=true
ENV NEXT_TELEMETRY_DISABLED=1
COPY apps/web apps/web
COPY packages/shared packages/shared
COPY packages/ui packages/ui
RUN pnpm --filter @leadpilot/web... build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app /app
EXPOSE 3000
CMD ["pnpm", "--filter", "@leadpilot/web", "start"]
