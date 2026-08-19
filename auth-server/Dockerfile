# This Dockerfile expects the Docker BUILD CONTEXT to be the repository root. On
# Render this is a manually-configured Docker Web Service, so the dashboard's "Root
# Directory" and "Docker Build Context Directory" fields must both be set to the
# repo root (blank/".") — mirrors online-store/server/Dockerfile's setup.
FROM node:20-alpine AS build
WORKDIR /app
COPY auth-server/package*.json ./
RUN npm install
COPY auth-server/tsconfig.json ./
COPY auth-server/src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY auth-server/package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist

# Stateless service — every OTP record lives in Firestore via the Admin SDK, so
# unlike online-store/server there is no local data/ folder and no volume to mount.
EXPOSE 4200
CMD ["node", "dist/index.js"]
