# Xem docs/10-trien-khai-van-hanh.md §5.1 — dùng CHUNG image này cho cả service `backend` (API,
# nhận traffic) lẫn `worker` (cron, RUN_JOBS=true, không nhận traffic) trong docker-compose.yml gốc
# repo — khác nhau chỉ ở biến môi trường/command lúc chạy, không phải 2 image riêng.

# --- Giai đoạn build ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate
COPY . .
RUN npm run build

# --- Giai đoạn chạy ---
FROM node:22-alpine
WORKDIR /app
# pg_dump cho job backup (src/jobs/backupDatabase.job.ts) — thiếu là backup luôn thất bại lúc chạy.
RUN apk add --no-cache postgresql-client
ENV NODE_ENV=production
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate && npm cache clean --force
COPY --from=builder /app/dist ./dist
# Chạy bằng user không phải root — image node:*-alpine có sẵn user "node" (uid 1000).
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://localhost:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
