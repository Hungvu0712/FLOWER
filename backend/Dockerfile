# Xem docs/10-trien-khai-van-hanh.md §5.1 — dùng CHUNG image này cho cả service `backend` (API,
# nhận traffic) lẫn `worker` (cron, RUN_JOBS=true, không nhận traffic) trong docker-compose.yml gốc
# repo — khác nhau chỉ ở biến môi trường/command lúc chạy, không phải 2 image riêng.

# --- Giai đoạn build ---
FROM node:22-alpine AS builder
WORKDIR /app
# BUG THẬT gặp lúc triển khai VPS thật (14/09/2026): thiếu gói `openssl` trên Alpine khiến Prisma
# KHÔNG nhận diện đúng phiên bản libssl, tự "đoán" sai (defaulting to openssl-1.1.x) rồi cố tải lại
# engine đúng lúc CONTAINER CHẠY THẬT (không phải lúc build) — ở giai đoạn chạy container dùng user
# không phải root (`USER node` bên dưới) nên không có quyền ghi vào node_modules, backend crash-loop
# liên tục. Cài `openssl` để Prisma nhận diện đúng ngay từ lúc `prisma generate`, không cần tải lại gì
# nữa lúc runtime.
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate
COPY . .
RUN npm run build

# --- Giai đoạn chạy ---
FROM node:22-alpine
WORKDIR /app
# openssl — xem giải thích ở giai đoạn build phía trên. postgresql-client cho pg_dump (job backup).
RUN apk add --no-cache openssl postgresql-client
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
