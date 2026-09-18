// proxy.ts gắn ?redirectTo=<path gốc> khi chặn truy cập trang cần đăng nhập — đọc lại để quay đúng
// chỗ sau khi đăng nhập thành công. Chỉ chấp nhận path nội bộ bắt đầu bằng "/" (không phải "//") để
// tránh open-redirect nếu ai đó tự chế query string trỏ ra domain khác.
export function getRedirectTarget(fallback = '/'): string {
  if (typeof window === 'undefined') {
    // eslint-disable-next-line no-console -- log chẩn đoán tạm thời
    console.log('[getRedirectTarget DEBUG] chạy trên SERVER (SSR) -> trả fallback', fallback);
    return fallback;
  }
  const target = new URLSearchParams(window.location.search).get('redirectTo');
  const result =
    target && target.startsWith('/') && !target.startsWith('//') ? target : fallback;
  // eslint-disable-next-line no-console -- log chẩn đoán tạm thời
  console.log(
    `[getRedirectTarget DEBUG] window.location.search="${window.location.search}" target="${target}" -> result="${result}"`,
    new Error('stack').stack,
  );
  return result;
}
