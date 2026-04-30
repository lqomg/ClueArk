FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci && npm cache clean --force

COPY . .

ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm run build

FROM node:22-alpine

RUN apk add --no-cache dumb-init wget

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=10s --start-period=25s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3100/api/health || exit 1

CMD ["dumb-init", "node", "dist/main.js"]
