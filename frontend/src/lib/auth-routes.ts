// Nguồn duy nhất cho "route nào cần đăng nhập" — dùng chung bởi proxy.ts (chặn lúc điều hướng) và
// useSessionExpiredHandler() (phiên chết GIỮA CHỪNG khi đang đứng ở route này, proxy không có cơ hội
// chặn vì không có điều hướng nào). Hai nơi lệch danh sách là một nơi bỏ sót.
// Riêng `config.matcher` trong proxy.ts buộc phải là literal tĩnh (Next.js đọc lúc build, không import
// được) — thêm prefix ở đây thì thêm tay cả ở đó.
export const PROTECTED_PATH_PREFIXES = ['/account', '/admin', '/superadmin'];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function loginUrlFor(pathname: string): string {
  return `/login?${new URLSearchParams({ redirectTo: pathname })}`;
}
