import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { getStorefrontCategories, getStorefrontSiteContent } from '@/lib/storefront-api';

// Route group PUBLIC (domain) — xem docs/03 §6. Nav/Footer dùng chung cho mọi trang
// storefront (trang chủ, sản phẩm, giỏ hàng...) khi các route đó được thêm sau này.
//
// Fetch categories/siteContent NGAY Ở LAYOUT (Server Component) rồi truyền xuống Nav/Footer (Client
// Component) qua prop — không nên để từng trang con tự gọi lại API danh mục/hotline/địa chỉ. Xem
// lib/storefront-api.ts. Các trang con CẦN site content riêng (Hero ở trang chủ, trang Liên hệ) tự
// gọi lại getStorefrontSiteContent() — Next.js dedupe cùng 1 request, không tốn thêm round-trip thật.
export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [categories, siteContent] = await Promise.all([
    getStorefrontCategories(),
    getStorefrontSiteContent(),
  ]);
  const rootCategories = categories.filter((c) => c.parentId === null);

  return (
    <div className="relative min-h-screen w-full bg-white">
      {/* Pink Glow Background — phủ absolute theo TOÀN BỘ chiều cao nội dung (không phải fixed
          theo viewport), nên kéo dài đúng xuống hết trang dù ngắn hay dài. */}
      <div
        aria-hidden
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            radial-gradient(125% 125% at 50% 90%, #ffffff 40%, #ec4899 100%)
          `,
          backgroundSize: '100% 100%',
        }}
      />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Nav categories={rootCategories} />
        <main className="flex-1">{children}</main>
        <Footer categories={rootCategories} siteContent={siteContent} />
      </div>
    </div>
  );
}
