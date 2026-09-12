import Link from 'next/link';
import { FlowerIcon } from '@/components/ui/FlowerIcon';
import { Hero } from '@/components/storefront/Hero';
import { ProductCard } from '@/components/storefront/ProductCard';
import {
  getStorefrontCategories,
  getStorefrontProducts,
  getStorefrontSiteContent,
} from '@/lib/storefront-api';

const CATEGORY_COLORS = ['#c95b52', '#d69a3a', '#c17a4a', '#c98fae', '#7a9b6e', '#b3856b'];

const VALUE_PROPS = [
  {
    title: 'Hoa tươi mỗi ngày',
    desc: 'Nhập hoa mỗi sáng, cắm theo đơn tại thời điểm đặt — không phải hàng lưu kho chờ bán.',
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="8" r="3" />
        <circle cx="7" cy="13" r="3" />
        <circle cx="17" cy="13" r="3" />
        <path d="M12 11v9" />
      </svg>
    ),
  },
  {
    title: 'Giao đúng ngày giờ hẹn',
    desc: 'Chọn khung giờ giao (sáng / chiều / tối) ngay khi đặt hàng — đặc biệt hợp với các dịp cần đúng thời điểm.',
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    ),
  },
  {
    title: 'Tư vấn nhanh, không mất công chờ',
    desc: 'Gọi điện hoặc nhắn Zalo, được báo giá và gợi ý mẫu phù hợp ngay trong vài phút.',
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M21 15.5a2 2 0 0 1-2 2H8l-5 4V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9.5Z" />
      </svg>
    ),
  },
  {
    title: 'Thanh toán khi nhận hàng',
    desc: 'Đặt trước, kiểm tra hoa tận tay rồi mới thanh toán — không cần chuyển khoản trước.',
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="2.5" y="5.5" width="19" height="13" rx="2.2" />
        <path d="M2.5 10h19" />
      </svg>
    ),
  },
];

export default async function StorefrontHomePage() {
  const [categories, products, siteContent] = await Promise.all([
    getStorefrontCategories(),
    getStorefrontProducts({ limit: 8 }),
    getStorefrontSiteContent(),
  ]);
  const rootCategories = categories.filter((c) => c.parentId === null);

  return (
    <>
      <Hero siteContent={siteContent} />

      {/* Danh mục hoa — thẻ hình ảnh thay vì pill phẳng, dễ lướt hơn trên mobile */}
      {rootCategories.length > 0 && (
        <section id="danh-muc" className="scroll-mt-28 px-8 pb-20 lg:px-16">
          <h2 className="font-display text-2xl font-semibold text-ink">Chọn theo dịp</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {rootCategories.map((cat, i) => (
              <Link
                key={cat.id}
                href={`/danh-muc/${cat.slug}`}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-white/70 bg-white/70 px-4 py-6 text-center shadow-sm backdrop-blur-md transition-all hover:-translate-y-1 hover:border-rose hover:shadow-lg"
              >
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-full transition-transform group-hover:scale-105"
                  style={{ backgroundColor: `${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}1f` }}
                >
                  <FlowerIcon
                    className="h-7 w-7"
                    color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                  />
                </span>
                <span className="text-sm font-semibold text-ink group-hover:text-rose-dark">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured products */}
      <section id="san-pham-noi-bat" className="scroll-mt-28 px-8 pb-24 lg:px-16">
        <div className="mb-8">
          <p className="text-sm font-semibold tracking-widest text-rose uppercase">Gợi ý cho bạn</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-ink">
            Mẫu hoa được chọn nhiều
          </h2>
        </div>

        {products.length === 0 ? (
          <p className="text-sm text-ink-muted">Chưa có sản phẩm nào — quay lại sau nhé.</p>
        ) : (
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} siteContent={siteContent} />
            ))}
          </div>
        )}
      </section>

      {/* Vì sao chọn Hoa Xinh — đưa lợi ích cụ thể lên thành nội dung chính, không chỉ 1 dòng trên hero */}
      <section className="bg-white px-8 py-20 lg:px-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-widest text-rose uppercase">
            Vì sao chọn Hoa Xinh
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-ink">
            Đặt hoa đơn giản, nhận đúng những gì bạn cần
          </h2>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_PROPS.map((v) => (
            <div key={v.title} className="rounded-2xl border border-border-soft/70 bg-ivory-50 p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-light text-rose-dark">
                {v.icon}
              </span>
              <h3 className="mt-4 text-sm font-semibold text-ink">{v.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA đậm — cùng ngôn ngữ với trang Liên hệ (tông ink, không phải màu rực) */}
      <section className="bg-ink px-8 py-14 lg:px-16">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center lg:flex-row lg:justify-between lg:text-left">
          <div>
            <h2 className="font-display text-2xl font-semibold text-white lg:text-3xl">
              Cần tư vấn chọn hoa phù hợp?
            </h2>
            <p className="mt-2 max-w-md text-sm text-white/70">
              Gọi hoặc nhắn Zalo — báo giá và gợi ý mẫu ngay trong vài phút, kể cả đơn gấp cần giao
              trong ngày.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={`tel:${siteContent.hotlineTel}`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-rose px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose/30 transition-colors hover:bg-rose-dark"
            >
              Gọi {siteContent.hotline}
            </a>
            <a
              href={siteContent.zaloLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Nhắn Zalo
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
