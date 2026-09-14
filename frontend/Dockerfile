# Xem docs/10-trien-khai-van-hanh.md §5.2. next.config.ts CHƯA bật `output: 'standalone'` nên copy
# nguyên node_modules/.next (nặng hơn standalone, nhưng đúng với cấu hình thật hiện tại — không tự ý
# bật standalone ở đây vì có thể ảnh hưởng hành vi build khác chưa kiểm chứng).
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_* được Next.js NHÚNG vào bundle lúc build — phải truyền ở bước build (ARG/ENV), KHÔNG
# đọc lại được lúc container chạy. Đổi giá trị sau này bắt buộc build lại image.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
# BUG THẬT phát hiện lúc kiểm tra ảnh Cloudinary trên VPS thật (14/09/2026): `next start` đọc
# next.config.ts LÚC SERVER KHỞI ĐỘNG (không chỉ lúc build) để biết domain ảnh nào được phép qua
# /_next/image — thiếu file này ở giai đoạn chạy khiến Next.js coi như KHÔNG có `images.remotePatterns`
# nào cả, mọi ảnh Cloudinary bị chặn với lỗi `"url" parameter is not allowed`, dù file build (.next)
# và next.config.ts ở giai đoạn build đều đúng.
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
USER node
EXPOSE 3000
CMD ["npm", "start"]
