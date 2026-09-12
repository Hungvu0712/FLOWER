import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/storefront/ProductCard';
import { FlowerIcon } from '@/components/ui/FlowerIcon';
import {
  getStorefrontOccasionBySlug,
  getStorefrontProducts,
  getStorefrontSiteContent,
} from '@/lib/storefront-api';

// docs/12 FE-06 — xem giải thích chung ở san-pham/[slug]/page.tsx (cùng cơ chế dedupe fetch).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const occasion = await getStorefrontOccasionBySlug(slug);
  if (!occasion) return { title: 'Không tìm thấy dịp lễ' };

  const description = `Hoa tươi cho dịp ${occasion.name.toLowerCase()} — giao tận nơi, đặt trước.`;

  return {
    title: occasion.name,
    description,
    openGraph: { title: occasion.name, description },
  };
}

// Trang liệt kê sản phẩm theo DỊP LỄ (occasion) — khác /danh-muc/[slug] (category): 1 sản phẩm gắn
// được NHIỀU dịp lễ cùng lúc (n-n), nên cùng 1 sản phẩm có thể xuất hiện ở nhiều trang dịp lễ khác
// nhau. Next.js 16: `params` là Promise trong Server Component route động — phải `await` trước khi dùng.
export default async function OccasionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const occasion = await getStorefrontOccasionBySlug(slug);
  if (!occasion) notFound();

  const [products, siteContent] = await Promise.all([
    getStorefrontProducts({ limit: 24, occasionId: occasion.id }),
    getStorefrontSiteContent(),
  ]);

  return (
    <div>
      <section className="bg-rose-light px-8 py-14 lg:px-16">
        <nav className="text-sm text-ink-muted">
          <Link href="/" className="hover:text-rose">
            Trang chủ
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink">{occasion.name}</span>
        </nav>

        <h1 className="mt-3 font-display text-4xl font-semibold text-ink lg:text-5xl">
          Hoa cho dịp {occasion.name}
        </h1>
        {products.length > 0 && (
          <p className="mt-4 text-sm font-medium text-rose-dark">{products.length} mẫu hoa</p>
        )}
      </section>

      <section className="px-8 py-14 lg:px-16">
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <FlowerIcon className="h-10 w-10" color="var(--color-rose)" />
            <p className="text-sm text-ink-muted">
              Chưa có sản phẩm nào cho dịp này — quay lại sau nhé.
            </p>
            <Link href="/" className="text-sm font-semibold text-rose hover:text-rose-dark">
              ← Về trang chủ xem mẫu khác
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} siteContent={siteContent} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
