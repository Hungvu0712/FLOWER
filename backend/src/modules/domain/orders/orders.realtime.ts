import type { Socket } from "socket.io";
import { getIO } from "../../core/realtime/realtime.service";
import { verifyAccessToken } from "../../../shared/utils/jwt";
import { loadUserRolesAndPermissions } from "../../../shared/utils/rbac";
import { logger } from "../../../shared/logger/logger";

// Room "TOÀN BỘ đơn hàng" cho dashboard quản trị — join room này PHẢI xác thực + đủ quyền, khác room
// theo từng đơn (order:<id>) chỉ cần biết đúng UUID (id đóng vai trò token, giống mô hình bảo mật của
// GET /orders/:id công khai — xem docs/modules/domain-orders.md). Trùng permission với 2 màn đang
// dùng realtime: /admin/orders (orders.view_all) và /admin/orders/delivery-queue (orders.view_delivery_queue).
const ADMIN_ROOM = "admin:orders";
const ADMIN_PERMISSIONS = ["orders.view_all", "orders.view_delivery_queue"];

// Socket.io KHÔNG chạy qua cookie-parser (middleware Express thường, chỉ áp dụng cho HTTP request/response
// bình thường) — tự đọc thẳng header Cookie thô lúc handshake. Chỉ cần đọc đúng 1 cookie cụ thể nên viết
// tay vài dòng, không cần thêm dependency `cookie` riêng.
function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

// Tách riêng khỏi handler socket.io để test được thẳng (mock verifyAccessToken/loadUserRolesAndPermissions)
// mà không phải dựng cả server Socket.io thật trong unit test.
export async function resolveAdminAccess(cookieHeader: string | undefined): Promise<boolean> {
  const token = readCookie(cookieHeader, "access_token");
  if (!token) return false;

  try {
    const { sub } = verifyAccessToken(token);
    const { permissions } = await loadUserRolesAndPermissions(sub);
    return ADMIN_PERMISSIONS.some((p) => permissions.includes(p));
  } catch {
    // Token hỏng/hết hạn — coi như không đủ quyền, KHÔNG throw (giống attachUserIfPresent, không
    // disconnect cả socket vì socket đó có thể vẫn đang theo dõi 1 đơn public khác qua order:watch).
    return false;
  }
}

// Gọi 1 lần ở server.ts, SAU initSocket() — đăng ký listener cho MỌI connection mới. Nhiều domain
// khác nếu cần realtime sau này tự thêm 1 hàm register*RealtimeHandlers() riêng, gọi `io.on("connection")`
// độc lập (Socket.io cho phép nhiều listener "connection" cùng lúc, không đè lẫn nhau).
export function registerOrdersRealtimeHandlers(): void {
  const io = getIO();
  if (!io) {
    logger.warn("registerOrdersRealtimeHandlers gọi trước initSocket() — bỏ qua.");
    return;
  }

  io.on("connection", (socket: Socket) => {
    // Theo dõi 1 đơn cụ thể (trang xác nhận đơn công khai /don-hang/:id) — không cần đăng nhập, biết
    // đúng UUID coi như có quyền xem đơn đó, đúng model bảo mật đã có của GET /orders/:id.
    socket.on("order:watch", (orderId: unknown) => {
      if (typeof orderId === "string" && orderId.length > 0) {
        socket.join(`order:${orderId}`);
      }
    });

    // Theo dõi TOÀN BỘ đơn hàng (dashboard quản trị) — PHẢI xác thực + đủ quyền, join nhầm room này
    // lộ trạng thái đơn của MỌI khách, không chỉ đơn của người đang xem.
    socket.on("admin:watch", () => {
      void resolveAdminAccess(socket.handshake.headers.cookie).then((allowed) => {
        if (allowed) socket.join(ADMIN_ROOM);
      });
    });
  });
}

// Gọi sau khi tạo đơn thành công — CHỈ báo cho dashboard quản trị (khách vừa đặt được điều hướng
// thẳng sang trang xác nhận, không cần biết "đơn của mình vừa được tạo" qua socket).
export function emitOrderCreated(order: { id: string }): void {
  getIO()?.to(ADMIN_ROOM).emit("order:created", order);
}

// Gọi sau khi đổi trạng thái đơn thành công — báo CẢ dashboard quản trị (danh sách/lịch giao hoa tự
// cập nhật) LẪN đúng khách đang xem trang xác nhận đơn đó (nếu có mở).
export function emitOrderStatusChanged(order: { id: string; status: string }): void {
  const io = getIO();
  io?.to(ADMIN_ROOM).emit("order:status_changed", order);
  io?.to(`order:${order.id}`).emit("order:status_changed", order);
}
