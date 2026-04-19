# ── Stage 1: Build ──────────────────────────────────
FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Production ────────────────────────────
FROM node:20-bookworm-slim AS production

WORKDIR /app

RUN groupadd -g 1001 nestjs && \
    useradd -m -u 1001 -g nestjs nestjs

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

RUN mkdir -p uploads && chown -R nestjs:nestjs /app

USER nestjs

EXPOSE 3000

CMD ["node", "dist/main"]
