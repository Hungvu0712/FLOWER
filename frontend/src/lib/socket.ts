import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

// Tạo ĐÚNG 1 kết nối WebSocket, dùng lại cho mọi hook realtime (xem
// features/domain/orders/orders.realtime.hooks.ts) — nhiều component cùng gọi getSocket() vẫn chỉ mở
// 1 kết nối duy nhất, chỉ thêm/gỡ listener riêng. withCredentials để gửi kèm cookie access_token lúc
// handshake (cho "admin:watch" xác thực quyền ở backend orders.realtime.ts) — cookie httpOnly, JS
// không đọc được nên không cần tự gắn thủ công, trình duyệt tự đính kèm.
export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      withCredentials: true,
    });
  }
  return socket;
}
