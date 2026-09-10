import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/storefront/ProductCard';
import { FlowerIcon } from '@/components/ui/FlowerIcon';
import {
  getStorefrontCategories,
  getStorefrontCategoryBySlug,
  getStorefrontProducts,
} from '@/lib/storefront-api';

// Next.js 16: `params` là Promise trong Server Component route động — phải `await` trước khi dùng.
export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await getStorefrontCategoryBySlug(slug);
  if (!category) notFound();

  const [allCategories, products] = await Promise.all([
    getStorefrontCategories(),
    // Chỉ lọc ĐÚNG danh mục này (categoryId), KHÔNG gồm sản phẩm của danh mục con — backend chưa hỗ
    // trợ lọc theo cả cây, xem docs/modules/domain-products.md §8.
    getStorefrontProducts({ limit: 24, categoryId: category.id }),
  ]);
  const childCategories = allCategories.filter((c) => c.parentId === category.id);

  return (
    <div>
      {/* Băng tiêu đề riêng — tách khỏi lưới sản phẩm bên dưới, giống cấu trúc trang Liên hệ */}
      <section className="bg-rose-light px-8 py-14 lg:px-16">
        <nav className="text-sm text-ink-muted">
          <Link href="/" className="hover:text-rose">Trang chủ</Link>
          <span className="mx-2">/</span>
          <span className="text-ink">{category.name}</span>
        </nav>

        <h1 className="mt-3 font-display text-4xl font-semibold text-ink lg:text-5xl">{category.name}</h1>
        {category.description && (
          <p className="mt-3 max-w-2xl text-ink-muted">{category.description}</p>
        )}
        {products.length > 0 && (
          <p className="mt-4 text-sm font-medium text-rose-dark">{products.length} mẫu hoa</p>
        )}

        {childCategories.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-3">
            {childCategories.map((child) => (
              <Link
                key={child.id}
                href={`/danh-muc/${child.slug}`}
                className="rounded-full border border-white/70 bg-white/70 px-5 py-2 text-sm font-medium text-ink-soft shadow-sm backdrop-blur-md transition-colors hover:border-rose hover:text-rose"
              >
                {child.name}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="px-8 py-14 lg:px-16">
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <FlowerIcon className="h-10 w-10" color="var(--color-rose)" />
            <p className="text-sm text-ink-muted">Chưa có sản phẩm nào trong danh mục này — quay lại sau nhé.</p>
            <Link href="/" className="text-sm font-semibold text-rose hover:text-rose-dark">
              ← Về trang chủ xem mẫu khác
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
