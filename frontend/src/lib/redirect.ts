// proxy.ts gắn ?redirectTo=<path gốc> khi chặn truy cập trang cần đăng nhập — đọc lại để quay đúng
// chỗ sau khi đăng nhập thành công. Chỉ chấp nhận path nội bộ bắt đầu bằng "/" (không phải "//") để
// tránh open-redirect nếu ai đó tự chế query string trỏ ra domain khác.
//
// Nhận giá trị thô từ caller (useSearchParams() ở client, request.nextUrl ở proxy.ts) thay vì tự đọc
// window.location: khi điều hướng phía client, trang mới render TRƯỚC khi URL trên thanh địa chỉ đổi —
// đọc window.location lúc đó ra URL của trang CŨ (mất ?redirectTo=), bật nhầm về '/' (docs/12 FE-08).
export function safeRedirectTarget(raw: string | null | undefined, fallback = '/'): string {
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return fallback;
}
