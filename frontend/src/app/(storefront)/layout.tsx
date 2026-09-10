import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';

// Route group PUBLIC (domain) — xem docs/03 §6. Nav/Footer dùng chung cho mọi trang
// storefront (trang chủ, sản phẩm, giỏ hàng...) khi các route đó được thêm sau này.
export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
