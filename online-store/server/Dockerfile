FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist

# The JSON ledger (data/stores.json) — every store's slug, API key hash, and product
# catalog — plus uploaded product/logo images (data/uploads/) live here. Mount your
# host's persistent disk/volume at this exact path, or every redeploy/restart silently
# wipes all registered stores and their images.
VOLUME ["/app/data"]

EXPOSE 4100
CMD ["node", "dist/index.js"]
