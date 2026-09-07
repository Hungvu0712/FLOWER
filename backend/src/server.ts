import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { logger } from './core/logger/logger';
import { registerJobs } from './jobs';

const server = app.listen(env.port, () => {
  logger.info(`API đang chạy tại http://localhost:${env.port} (env=${env.nodeEnv})`);

  if (env.isProd) {
    registerJobs();
  } else {
    logger.info('Cron jobs không chạy ở development — bật bằng NODE_ENV=production nếu cần test.');
  }
});

// Graceful shutdown — đóng HTTP server (không nhận request mới, chờ request đang xử lý xong) rồi mới
// ngắt kết nối Prisma, tránh cắt ngang transaction/query giữa chừng. Xem ARCHITECTURE.md §6.
async function shutdown(signal: string) {
  logger.info(`Nhận ${signal}, đang tắt server...`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Đã tắt server an toàn.');
    process.exit(0);
  });

  // Không chờ mãi — force exit nếu quá 10s (request treo/kết nối không đóng được).
  setTimeout(() => {
    logger.error('Không tắt được server trong 10s, buộc thoát.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
