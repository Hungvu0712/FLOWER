import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { AccountTabs } from '@/components/account/AccountTabs';

// Khu vực tài khoản khách hàng — dùng chung Nav/Footer với storefront (khác hẳn diện mạo sidebar
// dashboard của /admin, /superadmin — xem components/admin/AdminShell.tsx) để đúng tinh thần trang
// "khách hàng" thay vì "quản trị". Xem ARCHITECTURE.md §14.
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 lg:px-8">
        <AccountTabs />
        {children}
      </main>
      <Footer />
    </div>
  );
}
