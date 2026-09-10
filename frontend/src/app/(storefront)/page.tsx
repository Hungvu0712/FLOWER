import Link from 'next/link';
import { FlowerIcon } from '@/components/ui/FlowerIcon';
import { Button } from '@/components/ui/Button';
import { ProductCard } from '@/components/storefront/ProductCard';
import { getStorefrontCategories, getStorefrontProducts } from '@/lib/storefront-api';

export default async function StorefrontHomePage() {
  const [categories, products] = await Promise.all([
    getStorefrontCategories(),
    getStorefrontProducts({ limit: 8 }),
  ]);
  const rootCategories = categories.filter((c) => c.parentId === null);

  return (
    <>
      {/* Hero */}
      <section className="flex flex-col items-center gap-12 px-8 py-16 lg:flex-row lg:px-16 lg:py-24">
        <div className="flex-1">
          <p className="mb-5 text-sm font-semibold tracking-widest text-rose uppercase">Hoa tươi mỗi ngày</p>
          <h1 className="font-display text-5xl font-semibold leading-tight text-ink lg:text-6xl">
            Gửi trao yêu thương
            <br />
            qua từng cánh hoa
          </h1>
          <p className="mt-7 max-w-md text-lg leading-relaxed text-ink-muted">
            Đặt hoa tươi giao tận nơi theo đúng ngày giờ bạn chọn — sinh nhật, khai trương, cưới hỏi hay
            chỉ đơn giản là một lời hỏi thăm.
          </p>
          <div className="mt-9 flex gap-4">
            <Button>
              Đặt hoa ngay
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Button>
            <Button variant="outline">Xem bộ sưu tập</Button>
          </div>
        </div>
        <div className="flex flex-1 justify-center">
          <div className="flex h-80 w-80 items-center justify-center rounded-full bg-rose-light lg:h-96 lg:w-96">
            <FlowerIcon className="h-40 w-40" color="var(--color-rose)" />
          </div>
        </div>
      </section>

      {/* Category chips */}
      {rootCategories.length > 0 && (
        <section className="flex flex-wrap gap-3 px-8 pb-14 lg:px-16">
          {rootCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/danh-muc/${cat.slug}`}
              className="rounded-full border border-border bg-white px-6 py-2.5 text-sm font-medium text-ink-soft hover:border-rose hover:text-rose"
            >
              {cat.name}
            </Link>
          ))}
        </section>
      )}

      {/* Featured products */}
      <section className="px-8 pb-24 lg:px-16">
        <div className="mb-8 flex items-baseline justify-between">
          <h2 className="font-display text-3xl font-semibold text-ink">Hoa bán chạy</h2>
          <Link href="/" className="text-sm font-semibold text-rose hover:text-rose-dark">
            Xem tất cả →
          </Link>
        </div>

        {products.length === 0 ? (
          <p className="text-sm text-ink-muted">Chưa có sản phẩm nào — quay lại sau nhé.</p>
        ) : (
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
