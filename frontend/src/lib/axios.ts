import axios from 'axios';

// withCredentials: true — access_token/refresh_token là cookie httpOnly do backend set,
// trình duyệt tự đính kèm, KHÔNG cần (và không nên) tự tay gắn Authorization header.
// Xem docs/04 §5, docs/07 §1.
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  withCredentials: true,
});

let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

// access_token cố ý hết hạn ngắn (mặc định 5 phút, xem JWT_ACCESS_EXPIRES_IN ở backend) — tự động
// refresh 1 lần rồi retry request gốc, tránh user bị văng ra ngay khi token vừa hết hạn giữa phiên.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest?.url?.includes('/api/v1/auth/');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      // Đã có 1 request khác đang refresh — xếp hàng chờ thay vì gọi refresh trùng lặp.
      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingQueue.push(() => resolve(api(originalRequest)));
        });
      }

      isRefreshing = true;
      try {
        await api.post('/api/v1/auth/refresh');
        pendingQueue.forEach((resolve) => resolve());
        pendingQueue = [];
        // Request "chính" (request kích hoạt refresh) phải tự retry ở đây — KHÔNG được đẩy vào
        // pendingQueue vì hàng đợi vừa bị xoá rỗng ngay phía trên, đẩy vào đây thì không ai resolve
        // nữa, promise treo vĩnh viễn (bug thật đã xảy ra: user tưởng đã refresh xong nhưng request
        // gốc — vd useMe() — không bao giờ trả kết quả).
        return api(originalRequest);
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

    return Promise.reject(error);
  },
);
