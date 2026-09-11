'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useMe } from '@/features/core/account/account.hooks';
import { DashboardShell, type ShellNavSection } from '@/components/shell/DashboardShell';
import {
  IconDashboard,
  IconUsers,
  IconSliders,
  IconPackage,
  IconReceipt,
  IconShield,
  IconKey,
  IconTag,
  IconMail,
  IconHistory,
} from './icons';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
};

// Shell riêng cho /admin, /superadmin ("Quản trị") — cố ý khác diện mạo với trang tài khoản khách hàng
// /account (sidebar dashboard thay vì Nav/tabs storefront, xem app/account/layout.tsx), theo yêu cầu
// tách biệt trải nghiệm khách hàng và quản trị. Cả 2 route nằm trong route group app/(dashboard) nên
// chuyển trang giữa Tổng quan/Người dùng/Phương thức đăng nhập không remount sidebar.
//
// Quyền vào từng khu vực được quyết định NGAY TẠI ĐÂY dựa trên useMe() (luôn tra DB mới nhất qua
// GET /account/me) — KHÔNG còn ở proxy.ts (proxy chỉ check đã đăng nhập hay chưa, xem src/proxy.ts).
// Nhờ vậy đổi role trong DB có hiệu lực ngay sau F5, không cần đăng xuất/đăng nhập lại. Đây vẫn chỉ là
// lớp UX — API thật sự luôn được backend authorize() kiểm tra lại độc lập, không tin riêng frontend.
// Xem docs/02 §8, docs/04 §3.
export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: me, refetch: refetchMe } = useMe();

  // roles hiện lên sidebar (link "Hệ thống" ẩn/hiện...) — dùng dữ liệu useMe() bình thường, có thể tạm
  // lấy từ cache (staleTime 30s). Chỉ ảnh hưởng thẩm mỹ (ẩn/hiện link), không phải quyết định bảo mật
  // nên không cần chờ xác thực nghiêm ngặt như `authorized` bên dưới.
  const roles = me?.roles ?? [];
  const isSuperAdmin = roles.includes('super_admin');
  const isAdmin = isSuperAdmin || roles.includes('admin');
  const primaryRoleCode = isSuperAdmin ? 'super_admin' : 'admin';

  // `authorized` (gate nội dung trang thật) PHẢI dựa trên 1 lần gọi /account/me MỚI THẬT SỰ mỗi khi
  // đổi route trong khu quản trị — KHÔNG tin dữ liệu cache còn "tươi" theo staleTime, vì cache đó có
  // thể là kết quả fetch từ TRƯỚC KHI role vừa bị đổi (vd vừa bị hạ xuống member trong 30s trước), dẫn
  // tới hiện nhầm nội dung trang thật một nhịp trước khi kịp phát hiện đã mất quyền.
  const [verified, setVerified] = useState<{ pathname: string; roles: string[] } | null>(null);
  useEffect(() => {
    let cancelled = false;
    refetchMe().then((result) => {
      if (!cancelled) setVerified({ pathname, roles: result.data?.roles ?? [] });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  // Chỉ tin verified khi nó ứng với ĐÚNG pathname hiện tại — vừa đổi route thì coi như chưa xác thực
  // (null) cho tới khi effect trên chạy xong cho route mới, tránh dùng nhầm kết quả xác thực của route
  // trước đó.
  const verifiedRoles = verified?.pathname === pathname ? verified.roles : null;

  const needsSuperAdmin = pathname.startsWith('/superadmin');
  const needsAdmin = pathname.startsWith('/admin');
  const authorized =
    verifiedRoles === null
      ? null // chưa xác thực xong — không kết luận đúng/sai, cũng không render children thật (xem dưới)
      : needsSuperAdmin
        ? verifiedRoles.includes('super_admin')
        : needsAdmin
          ? verifiedRoles.includes('admin') || verifiedRoles.includes('super_admin')
          : true;

  useEffect(() => {
    // Đã đăng nhập nhưng không đủ quyền → /403 (không phải /login, vì họ ĐÃ authenticated — chưa đăng
    // nhập thì proxy.ts đã chặn từ trước khi vào tới đây, xem src/proxy.ts).
    if (authorized === false) router.replace('/403');
  }, [authorized, router]);

  const sections: ShellNavSection[] = [
    {
      title: 'Vận hành',
      items: [
        { href: '/admin', label: 'Tổng quan', icon: IconDashboard },
        { href: '/admin/categories', label: 'Danh mục', icon: IconTag },
        { href: '/admin/products', label: 'Sản phẩm', icon: IconPackage },
        { href: '/admin/orders', label: 'Đơn hàng', icon: IconReceipt },
        { href: '/admin/contact', label: 'Liên hệ', icon: IconMail },
      ],
    },
  ];

  if (isSuperAdmin) {
    sections.push({
      title: 'Hệ thống',
      items: [
        { href: '/superadmin/users', label: 'Người dùng', icon: IconUsers },
        { href: '/superadmin/roles', label: 'Role', icon: IconShield },
        { href: '/superadmin/permissions', label: 'Permission', icon: IconKey },
        { href: '/superadmin/login-methods', label: 'Phương thức đăng nhập', icon: IconSliders },
        { href: '/superadmin/audit-logs', label: 'Nhật ký Audit', icon: IconHistory },
      ],
    });
  }

  return (
    <DashboardShell
      brandSubtitle="Quản trị"
      sections={sections}
      footerLine={isAdmin ? (ROLE_LABELS[primaryRoleCode] ?? primaryRoleCode) : (me?.email ?? '')}
    >
      {authorized ? (
        children
      ) : (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-ink-muted">
            {authorized === null ? 'Đang kiểm tra quyền truy cập...' : 'Đang chuyển hướng...'}
          </p>
        </div>
      )}
    </DashboardShell>
  );
}
