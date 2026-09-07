// proxy.ts gắn ?redirectTo=<path gốc> khi chặn truy cập trang cần đăng nhập — đọc lại để quay đúng
// chỗ sau khi đăng nhập thành công. Chỉ chấp nhận path nội bộ bắt đầu bằng "/" (không phải "//") để
// tránh open-redirect nếu ai đó tự chế query string trỏ ra domain khác.
export function getRedirectTarget(fallback = '/'): string {
  if (typeof window === 'undefined') return fallback;
  const target = new URLSearchParams(window.location.search).get('redirectTo');
  if (target && target.startsWith('/') && !target.startsWith('//')) return target;
  return fallback;
}
