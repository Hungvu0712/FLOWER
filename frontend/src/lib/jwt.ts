// Giải mã (KHÔNG verify chữ ký) phần payload của JWT — chỉ dùng để đọc roles/permissions cho mục đích
// UX (ẩn/hiện menu, redirect sớm ở proxy.ts). Nguồn sự thật thật sự luôn là backend: mọi request
// nhạy cảm backend đều verify + authorize lại, không tin riêng dữ liệu decode ở đây.
// Xem SECURITY.md §2 ("không bao giờ tin tưởng kiểm tra quyền ở frontend").
export type AccessTokenPayload = {
  sub: string;
  roles: string[];
  permissions: string[];
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
