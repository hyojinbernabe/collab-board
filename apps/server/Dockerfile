# build from the repo root: docker build -f apps/server/Dockerfile .
FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile
COPY apps/server apps/server
RUN pnpm --filter @collab-board/server build \
  && pnpm --filter @collab-board/server deploy --prod /out

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out .
COPY --from=build /app/apps/server/dist ./dist
EXPOSE 1234
USER node
CMD ["node", "dist/index.js"]
