import { describe, expect, it } from 'vitest';
import { safeRedirectTarget } from '@/lib/redirect';

describe('safeRedirectTarget — chống open redirect', () => {
  it('trả về path nội bộ hợp lệ', () => {
    expect(safeRedirectTarget('/superadmin/users')).toBe('/superadmin/users');
  });

  it('CHẶN redirect ra domain khác dạng //evil.com', () => {
    expect(safeRedirectTarget('//ke-tan-cong.example/phishing')).toBe('/');
  });

  it('CHẶN URL tuyệt đối http/https', () => {
    expect(safeRedirectTarget('https://ke-tan-cong.example')).toBe('/');
  });

  it('CHẶN path không bắt đầu bằng /', () => {
    expect(safeRedirectTarget('superadmin/users')).toBe('/');
  });

  it('không có redirectTo (null/undefined/rỗng) → dùng fallback', () => {
    expect(safeRedirectTarget(null)).toBe('/');
    expect(safeRedirectTarget(undefined)).toBe('/');
    expect(safeRedirectTarget('')).toBe('/');
    expect(safeRedirectTarget(null, '/account/profile')).toBe('/account/profile');
  });

  it('giữ nguyên query string trong path nội bộ', () => {
    expect(safeRedirectTarget('/admin/categories?page=2')).toBe('/admin/categories?page=2');
  });

  // docs/12 FE-08: bản cũ tự đọc window.location — khi điều hướng phía client, trang login render
  // TRƯỚC khi URL đổi nên đọc ra URL trang cũ và bật nhầm về '/'. Hàm giờ chỉ xử lý giá trị được đưa vào.
  it('KHÔNG tự đọc window.location — chỉ dựa vào giá trị caller truyền vào', () => {
    window.history.replaceState({}, '', '/login?redirectTo=/admin');
    expect(safeRedirectTarget(null)).toBe('/');
  });
});
