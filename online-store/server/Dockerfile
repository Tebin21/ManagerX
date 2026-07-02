# This Dockerfile expects the Docker BUILD CONTEXT to be the repository root (it COPYs
# from both online-store/server/ and the sibling lib/ folder). On Render this is a
# manually-configured Docker Web Service, so the dashboard's "Root Directory" and "Docker
# Build Context Directory" fields must both be set to the repo root (blank/".") — they are
# independent of render.yaml's dockerContext and won't pick up changes made only there.
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
# subscriptionCore.js (copied to /lib below) requires 'tweetnacl' at load time. Node
# resolves bare specifiers by walking up from the requiring file's own directory, so from
# /lib it checks /lib/node_modules then /node_modules — never /app/node_modules, since
# /app and /lib are unrelated sibling directories. Placing it at /node_modules mirrors the
# repo's own layout, where lib/ and node_modules/ are siblings at the repo root.
RUN mkdir -p /node_modules && cp -r node_modules/tweetnacl /node_modules/tweetnacl
COPY --from=build /app/dist ./dist
COPY lib /lib

# The JSON ledger (data/stores.json) — every store's slug, API key hash, and product
# catalog — plus uploaded product/logo images (data/uploads/) live here. Mount your
# host's persistent disk/volume at this exact path, or every redeploy/restart silently
# wipes all registered stores and their images.
VOLUME ["/app/data"]

EXPOSE 4100
CMD ["node", "dist/index.js"]
