FROM node:20-alpine AS build
WORKDIR /app
COPY online-store/server/package*.json ./
RUN npm install
COPY online-store/server/tsconfig.json ./
COPY online-store/server/src ./src
# Shared monorepo code (e.g. subscriptionAuth.ts's '../../../lib/...' require) lives
# outside this project's own folder. Node resolves that relative import to /lib at
# runtime (three levels up from /app/dist clamps at the container's filesystem root),
# so it must be copied to that exact absolute path — not /app/lib.
COPY lib /lib
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY online-store/server/package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY lib /lib

# The JSON ledger (data/stores.json) — every store's slug, API key hash, and product
# catalog — plus uploaded product/logo images (data/uploads/) live here. Mount your
# host's persistent disk/volume at this exact path, or every redeploy/restart silently
# wipes all registered stores and their images.
VOLUME ["/app/data"]

EXPOSE 4100
CMD ["node", "dist/index.js"]
