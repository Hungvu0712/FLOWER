'use client';

import { useMe } from '@/features/core/account/account.hooks';
import { DashboardShell, type ShellNavSection } from '@/components/shell/DashboardShell';
import { IconDashboard, IconUsers, IconSliders, IconPackage, IconReceipt, IconShield, IconKey } from './icons';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
};

// Shell riêng cho /admin, /superadmin ("Quản trị") — cố ý khác diện mạo với trang tài khoản khách hàng
// /account (sidebar dashboard thay vì Nav/tabs storefront, xem app/account/layout.tsx), theo yêu cầu
// tách biệt trải nghiệm khách hàng và quản trị. Cả 2 route nằm trong route group app/(dashboard) nên
// chuyển trang giữa Tổng quan/Người dùng/Phương thức đăng nhập không remount sidebar. Nav hiện thêm
// mục "Hệ thống" nếu là super_admin; quyền thật sự vẫn do proxy.ts + backend authorize() quyết định.
// Xem ARCHITECTURE.md §14.
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { data: me } = useMe();
  const roles = me?.roles ?? [];
  const isSuperAdmin = roles.includes('super_admin');
  const isAdmin = isSuperAdmin || roles.includes('admin');
  const primaryRoleCode = isSuperAdmin ? 'super_admin' : 'admin';

  const sections: ShellNavSection[] = [
    {
      title: 'Vận hành',
      items: [
        { href: '/admin', label: 'Tổng quan', icon: IconDashboard },
        { href: '/admin/products', label: 'Sản phẩm', icon: IconPackage, soon: true },
        { href: '/admin/orders', label: 'Đơn hàng', icon: IconReceipt, soon: true },
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
      ],
    });
  }

  return (
    <DashboardShell
      brandSubtitle="Quản trị"
      sections={sections}
      footerLine={isAdmin ? (ROLE_LABELS[primaryRoleCode] ?? primaryRoleCode) : (me?.email ?? '')}
    >
      {children}
    </DashboardShell>
  );
}
