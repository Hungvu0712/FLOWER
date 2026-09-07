import axios from 'axios';

// withCredentials: true — access_token/refresh_token là cookie httpOnly do backend set,
// trình duyệt tự đính kèm, KHÔNG cần (và không nên) tự tay gắn Authorization header.
// Xem ARCHITECTURE.md §13.3, SECURITY.md §1.
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  withCredentials: true,
});

let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

// access_token hết hạn sau 15 phút — tự động refresh 1 lần rồi retry request gốc,
// tránh user bị văng ra ngay khi token vừa hết hạn giữa phiên làm việc.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest?.url?.includes('/api/v1/auth/');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          await api.post('/api/v1/auth/refresh');
          pendingQueue.forEach((resolve) => resolve());
          pendingQueue = [];
        } catch {
          // Không có refresh token hợp lệ — có thể chỉ là khách chưa đăng nhập ghé trang public
          // (vd gọi useMe() ở trang chủ). Không tự ý redirect ở đây: route thật sự cần đăng nhập đã
          // được proxy.ts chặn từ trước khi vào trang; cứ để lỗi 401 trả về cho caller tự xử lý.
          pendingQueue = [];
          return Promise.reject(error);
        } finally {
          isRefreshing = false;
        }
      }

      return new Promise((resolve) => {
        pendingQueue.push(() => resolve(api(originalRequest)));
      });
    }

    return Promise.reject(error);
  },
);
