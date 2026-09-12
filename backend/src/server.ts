import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { logger } from "./shared/logger/logger";
import { registerJobs } from "./jobs";
import { initSocket } from "./modules/core/realtime/realtime.service";
import { registerOrdersRealtimeHandlers } from "./modules/domain/orders/orders.realtime";

const server = app.listen(env.port, () => {
  logger.info(`API đang chạy tại http://localhost:${env.port} (env=${env.nodeEnv})`);

  // Gắn Socket.io vào ĐÚNG http.Server này (chung cổng với HTTP, không mở cổng riêng) — phải sau khi
  // listen() đã có server thật. Xem docs/modules/domain-orders.md §10.
  initSocket(server);
  registerOrdersRealtimeHandlers();

  // docs/12 OPS-01: RUN_JOBS tách rời khỏi NODE_ENV — cho phép chạy nhiều instance API (scale ngang)
  // mà chỉ 1 container `worker` riêng (RUN_JOBS=true) chạy cron, tránh backup/dọn file trùng lặp.
  if (env.isProd && env.runJobs) {
    registerJobs();
  } else if (!env.isProd) {
    logger.info(
      "Cron jobs không chạy ở development — bật bằng NODE_ENV=production + RUN_JOBS=true.",
    );
  } else {
    logger.info("Cron jobs không chạy trên instance này (RUN_JOBS != true) — xem docs/10 §5.3.");
  }
});

// Graceful shutdown — đóng HTTP server (không nhận request mới, chờ request đang xử lý xong) rồi mới
// ngắt kết nối Prisma, tránh cắt ngang transaction/query giữa chừng. Xem docs/03 §5, §8.
async function shutdown(signal: string) {
  logger.info(`Nhận ${signal}, đang tắt server...`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("Đã tắt server an toàn.");
    process.exit(0);
  });

  // Không chờ mãi — force exit nếu quá 10s (request treo/kết nối không đóng được).
  setTimeout(() => {
    logger.error("Không tắt được server trong 10s, buộc thoát.");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
