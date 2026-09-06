import { NextRequest, NextResponse } from 'next/server';
import { decodeAccessToken } from '@/lib/jwt';

// Next.js 16: quy ước "proxy" (đổi tên từ "middleware") — xem node_modules/next/dist/docs khi có
// breaking change tương tự trong tương lai. Chặn sớm theo phạm vi truy cập — chỉ kiểm tra "đã đăng
// nhập" + role thô ở đây; permission chi tiết theo từng trang được kiểm tra lại trong layout tương
// ứng (Server Component) VÀ luôn được backend authorize() kiểm tra lại lần nữa — proxy chỉ để
// redirect sớm cho trải nghiệm mượt hơn, KHÔNG phải lớp bảo mật duy nhất.
// Xem ARCHITECTURE.md §8.1, SECURITY.md §2.
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

  if (pathname.startsWith('/superadmin') && !payload?.roles.includes('super_admin')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (pathname.startsWith('/admin') && !payload?.roles.some((r) => ['admin', 'super_admin'].includes(r))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/account/:path*', '/admin/:path*', '/superadmin/:path*', '/login', '/register'],
};
