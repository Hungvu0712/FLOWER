// Giải mã (KHÔNG verify chữ ký) phần payload của JWT — CHỈ dùng để đọc `exp` cho mục đích xác thực
// (còn hạn hay không) ở proxy.ts. JWT không còn nhúng role/permission (xem backend core/utils/jwt.ts)
// — mọi quyết định phân quyền đều dựa vào dữ liệu tươi từ GET /api/v1/account/me hoặc backend
// authorize(), không đọc từ token. Xem SECURITY.md §2.
export type AccessTokenPayload = {
  sub: string;
  exp: number;
};

export function decodeAccessToken(token: string): AccessTokenPayload | null {
  try {
    const payloadBase64 = token.split('.')[1];
    const json = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
