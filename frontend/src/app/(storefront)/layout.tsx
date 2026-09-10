import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { getStorefrontCategories } from '@/lib/storefront-api';

// Route group PUBLIC (domain) — xem docs/03 §6. Nav/Footer dùng chung cho mọi trang
// storefront (trang chủ, sản phẩm, giỏ hàng...) khi các route đó được thêm sau này.
//
// Fetch categories NGAY Ở LAYOUT (Server Component) rồi truyền xuống Nav (Client Component) qua
// prop — Nav dùng chung với layout auth/account, không nên tự gọi API danh mục ở những trang không
// cần dropdown "Sản phẩm". Xem lib/storefront-api.ts.
export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const categories = await getStorefrontCategories();
  const rootCategories = categories.filter((c) => c.parentId === null);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav categories={rootCategories} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
