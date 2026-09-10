import { AdminShell } from '@/components/admin/AdminShell';

// Route group (dashboard) gộp /admin, /superadmin dưới 1 layout.tsx duy nhất (route group không đổi
// URL) — Next.js không remount sidebar khi chuyển trang giữa các mục, header/nav/footer luôn giữ
// nguyên. /account nằm ngoài group này, dùng layout riêng (app/account/layout.tsx) với diện mạo
// khách hàng khác hẳn. Xem docs/04 §3.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
