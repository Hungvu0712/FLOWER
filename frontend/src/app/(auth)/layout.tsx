import { Nav } from '@/components/layout/Nav';

// Dùng chung Nav (sticky) với storefront để giao diện nhất quán khi chuyển giữa trang chủ và
// đăng nhập/đăng ký — chỉ phần form bên dưới là riêng cho khu vực auth.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <Nav />
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="rounded-3xl border border-border-soft bg-white p-8 shadow-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
