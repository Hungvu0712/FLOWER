import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { config, proxy } from '@/proxy';

function tokenWithExp(secondsFromNow: number): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'HS256' })}.${b64({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + secondsFromNow })}.sig`;
}

function req(pathname: string, cookie?: string): NextRequest {
  const request = new NextRequest(new URL(`http://localhost:3000${pathname}`));
  if (cookie) request.cookies.set('access_token', cookie);
  return request;
}

const PROTECTED = [
  '/account/profile',
  '/account/devices',
  '/admin',
  '/admin/categories',
  '/superadmin/users',
];

describe('proxy — chưa đăng nhập', () => {
  it.each(PROTECTED)('chặn %s và ghi nhớ đích đến qua ?redirectTo', (pathname) => {
    const res = proxy(req(pathname));
    const location = new URL(res.headers.get('location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('redirectTo')).toBe(pathname);
  });

  it('token hết hạn cũng bị coi như chưa đăng nhập', () => {
    const res = proxy(req('/admin', tokenWithExp(-60)));
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login');
  });

  it('token rác không làm vỡ proxy — coi như chưa đăng nhập', () => {
    const res = proxy(req('/admin', 'khong-phai-jwt'));
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login');
  });

  it('cho vào trang đăng nhập/đăng ký bình thường', () => {
    expect(proxy(req('/login')).headers.get('location')).toBeNull();
    expect(proxy(req('/register')).headers.get('location')).toBeNull();
  });
});

describe('proxy — đã đăng nhập', () => {
  const valid = tokenWithExp(300);

  it.each(PROTECTED)('cho vào %s', (pathname) => {
    expect(proxy(req(pathname, valid)).headers.get('location')).toBeNull();
  });

  it('đá khỏi /login và /register về trang chủ', () => {
    for (const path of ['/login', '/register']) {
      const res = proxy(req(path, valid));
      expect(new URL(res.headers.get('location')!).pathname).toBe('/');
    }
  });

  it('KHÔNG chặn theo role — vào /superadmin với token member vẫn qua được proxy', () => {
    // Chủ đích: JWT không nhúng role, nên proxy chỉ kiểm tra 'đã đăng nhập chưa'.
    // Chặn theo quyền là việc của AdminShell (UX) và backend authorize() (bảo mật thật).
    expect(proxy(req('/superadmin/users', valid)).headers.get('location')).toBeNull();
  });
});

describe('config.matcher', () => {
  it('bao phủ đúng các nhánh cần bảo vệ + trang auth', () => {
    expect(config.matcher).toEqual([
      '/account/:path*',
      '/admin/:path*',
      '/superadmin/:path*',
      '/login',
      '/register',
    ]);
  });

  it('/account phải là route THẬT (không phải route group) để matcher khớp được theo prefix', () => {
    expect(config.matcher.some((m) => m.startsWith('/account'))).toBe(true);
  });
});
