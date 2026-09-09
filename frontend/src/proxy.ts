import { NextRequest, NextResponse } from 'next/server';
import { decodeAccessToken } from '@/lib/jwt';

// proxy.ts CHỈ kiểm tra "đã đăng nhập hay chưa" (authentication — token còn hạn không) — KHÔNG dựa vào
// role/permission để quyết định cho vào /admin hay /superadmin (authorization). JWT không còn nhúng
// role/permission (xem backend core/utils/jwt.ts), và dù có nhúng thì token cũ vẫn có thể sai lệch với
// role thật trong DB (vd vừa được cấp quyền admin nhưng token cũ chưa cập nhật) — chặn ở đây theo dữ
// liệu cũ sẽ khiến role đổi trong DB không có hiệu lực ngay sau F5.
//
// Việc kiểm tra role/permission thật sự nằm ở 2 nơi, đều dựa trên dữ liệu tươi:
//   1. AdminShell (client component) — gọi useMe() (luôn tra DB mới nhất qua GET /account/me) để
//      redirect sớm nếu vào nhầm khu vực — chỉ là lớp UX.
//   2. Backend authorize() — lớp bảo mật THẬT SỰ, luôn tra role/permission hiện tại từ DB cho mỗi
//      request (xem core/middleware/authenticate.ts).
// Xem ARCHITECTURE.md §10, §14, SECURITY.md §2.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('access_token')?.value;
  const payload = token ? decodeAccessToken(token) : null;
  const isExpired = payload ? payload.exp * 1000 < Date.now() : true;
  const isAuthenticated = Boolean(payload) && !isExpired;

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const needsAuth = pathname.startsWith('/account') || pathname.startsWith('/admin') || pathname.startsWith('/superadmin');
  if (needsAuth && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/account/:path*', '/admin/:path*', '/superadmin/:path*', '/login', '/register'],
};
