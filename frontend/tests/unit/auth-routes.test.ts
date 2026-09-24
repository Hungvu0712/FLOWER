import { describe, expect, it } from 'vitest';
import { PROTECTED_PATH_PREFIXES, isProtectedPath, loginUrlFor } from '@/lib/auth-routes';
import { config } from '@/proxy';

describe('isProtectedPath', () => {
  it.each(['/account/profile', '/admin', '/admin/orders', '/superadmin/users'])(
    '%s cần đăng nhập',
    (pathname) => expect(isProtectedPath(pathname)).toBe(true),
  );

  it.each(['/', '/login', '/register', '/san-pham/hoa-hong', '/gio-hang', '/thanh-toan'])(
    '%s là trang công khai',
    (pathname) => expect(isProtectedPath(pathname)).toBe(false),
  );

  // matcher của proxy.ts buộc là literal tĩnh nên không dùng chung được danh sách — test này bắt lỗi
  // thêm prefix ở 1 nơi mà quên nơi kia (proxy không chạy cho route mới → không chặn được).
  it('mọi prefix cần đăng nhập đều có trong config.matcher của proxy.ts', () => {
    for (const prefix of PROTECTED_PATH_PREFIXES) {
      expect(config.matcher).toContain(`${prefix}/:path*`);
    }
  });
});

describe('loginUrlFor', () => {
  it('ghi nhớ đích đến qua ?redirectTo, mã hoá đúng', () => {
    const url = new URL(loginUrlFor('/account/devices'), 'http://localhost');
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('redirectTo')).toBe('/account/devices');
  });
});
