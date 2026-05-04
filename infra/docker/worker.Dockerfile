FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/database/package.json packages/database/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY apps/worker apps/worker
COPY packages/shared packages/shared
COPY packages/database packages/database
RUN pnpm --filter @leadpilot/worker build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app /app
CMD ["pnpm", "--filter", "@leadpilot/worker", "start"]
