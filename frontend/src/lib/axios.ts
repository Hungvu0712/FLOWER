import axios from 'axios';

// withCredentials: true — access_token/refresh_token là cookie httpOnly do backend set,
// trình duyệt tự đính kèm, KHÔNG cần (và không nên) tự tay gắn Authorization header.
// Xem docs/04 §5, docs/07 §1.
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  withCredentials: true,
});

type PendingRequest = { retry: () => void; fail: () => void };

let isRefreshing = false;
let pendingQueue: PendingRequest[] = [];

function drainQueue(): PendingRequest[] {
  const current = pendingQueue;
  pendingQueue = [];
  return current;
}

// Báo cho tầng UI (useSessionExpiredHandler) khi phiên đã chết hẳn — file này cố ý không biết React
// Query/router tồn tại (docs/04 §1), nên chỉ phát tín hiệu, không tự xoá cache hay điều hướng.
type SessionExpiredListener = () => void;
const sessionExpiredListeners = new Set<SessionExpiredListener>();

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

// Chỉ 401/403 từ /auth/refresh mới chắc chắn phiên đã chết (hết hạn, bị thu hồi, tài khoản bị khoá).
// Lỗi mạng/5xx/429 thì phiên có thể vẫn còn — báo "hết phiên" lúc đó là đăng xuất nhầm người dùng.
function isSessionDead(refreshError: unknown): boolean {
  const status = axios.isAxiosError(refreshError) ? refreshError.response?.status : undefined;
  return status === 401 || status === 403;
}

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
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            retry: () => resolve(api(originalRequest)),
            fail: () => reject(error),
          });
        });
      }

      isRefreshing = true;
      try {
        await api.post('/api/v1/auth/refresh');
        drainQueue().forEach((pending) => pending.retry());
        // Request "chính" (request kích hoạt refresh) phải tự retry ở đây — KHÔNG được đẩy vào
        // pendingQueue vì hàng đợi vừa bị xoá rỗng ngay phía trên, đẩy vào đây thì không ai resolve
        // nữa, promise treo vĩnh viễn (bug thật đã xảy ra: user tưởng đã refresh xong nhưng request
        // gốc — vd useMe() — không bao giờ trả kết quả).
        return api(originalRequest);
      } catch (refreshError) {
        // PHẢI reject từng request đang xếp hàng — trước đây chỉ gán `pendingQueue = []`, các promise
        // đó treo vĩnh viễn; useMe() kẹt ở trạng thái "đang tải" với dữ liệu user CŨ, kể cả refetch khi
        // focus lại tab cũng treo theo, chỉ F5 mới thoát (docs/12 FE-09).
        drainQueue().forEach((pending) => pending.fail());
        // Không tự redirect ở đây: khách chưa đăng nhập ghé trang public (vd useMe() ở trang chủ) cũng
        // đi vào nhánh này — việc xoá cache user và quyết định có cần đưa về /login hay không là của
        // useSessionExpiredHandler().
        if (isSessionDead(refreshError)) sessionExpiredListeners.forEach((listener) => listener());
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
