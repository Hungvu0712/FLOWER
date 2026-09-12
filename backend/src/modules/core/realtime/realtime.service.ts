import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { env } from "../../../config/env";
import { logger } from "../../../shared/logger/logger";

// Hạ tầng dùng chung, KHÔNG biết gì về "đơn hàng"/domain cụ thể nào — giống email.service.ts (chỉ lo
// transport, nội dung/room/event cụ thể do domain tự soạn qua getIO() sau khi initSocket() chạy xong,
// xem modules/domain/orders/orders.realtime.ts). Giữ 1 instance duy nhất trong module-scope thay vì
// export cả class — mọi nơi cần phát event chỉ cần getIO(), không cần biết io được tạo ở đâu/khi nào.
let io: SocketIOServer | null = null;

// Gọi ĐÚNG 1 LẦN ở server.ts, ngay sau app.listen() — cần http.Server thật để Socket.io gắn WebSocket
// upgrade vào cùng cổng với HTTP (không mở cổng riêng). CORS/credentials khớp đúng cấu hình cors() ở
// app.ts — client cần gửi cookie access_token qua handshake để xác thực (admin:watch, xem orders.realtime.ts).
export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: env.frontendUrl, credentials: true },
  });
  logger.info("Socket.io realtime server đã khởi động.");
  return io;
}

// null trước khi initSocket() chạy (vd trong test unit — không có HTTP server thật) — nơi gọi tự
// dùng optional chaining (`getIO()?.to(...)`), không throw, để domain event emit là best-effort.
export function getIO(): SocketIOServer | null {
  return io;
}
