import Link from 'next/link';
import { FlowerIcon } from '@/components/ui/FlowerIcon';
import { ProductCard } from '@/components/storefront/ProductCard';
import { HOTLINE, HOTLINE_DISPLAY, ZALO_LINK } from '@/lib/contact-info';
import { getStorefrontCategories, getStorefrontProducts } from '@/lib/storefront-api';

const CATEGORY_COLORS = ['#c95b52', '#d69a3a', '#c17a4a', '#c98fae', '#7a9b6e', '#b3856b'];

const VALUE_PROPS = [
  {
    title: 'Hoa tươi mỗi ngày',
    desc: 'Nhập hoa mỗi sáng, cắm theo đơn tại thời điểm đặt — không phải hàng lưu kho chờ bán.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    ),
  },
  {
    title: 'Tư vấn nhanh, không mất công chờ',
    desc: 'Gọi điện hoặc nhắn Zalo, được báo giá và gợi ý mẫu phù hợp ngay trong vài phút.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 15.5a2 2 0 0 1-2 2H8l-5 4V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9.5Z" />
      </svg>
    ),
  },
  {
    title: 'Thanh toán khi nhận hàng',
    desc: 'Đặt trước, kiểm tra hoa tận tay rồi mới thanh toán — không cần chuyển khoản trước.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2.5" y="5.5" width="19" height="13" rx="2.2" />
        <path d="M2.5 10h19" />
      </svg>
    ),
  },
];

export default async function StorefrontHomePage() {
  const [categories, products] = await Promise.all([
    getStorefrontCategories(),
    getStorefrontProducts({ limit: 8 }),
  ]);
  const rootCategories = categories.filter((c) => c.parentId === null);

  return (
    <>
      {/* Hero — quầng sáng hồng phủ (storefront)/layout.tsx, riêng khối này chỉ lo nội dung */}
      <section className="flex flex-col items-center gap-14 px-8 pt-14 pb-20 lg:flex-row lg:px-16 lg:pt-20 lg:pb-28">
        <div className="flex-1">
          <span className="inline-flex items-center gap-2 rounded-full border border-rose/15 bg-white/70 px-4 py-1.5 text-sm font-semibold text-rose shadow-sm backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-rose" />
            Hoa tươi mỗi ngày
          </span>
          <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] text-ink lg:text-7xl">
            Gửi trao
            <br />
            yêu thương
            <br />
            <span className="text-rose">qua từng cánh hoa</span>
          </h1>
          <p className="mt-7 max-w-md text-lg leading-relaxed text-ink-muted">
            Đặt hoa tươi giao tận nơi theo đúng ngày giờ bạn chọn — sinh nhật, khai trương, cưới hỏi
            hay chỉ đơn giản là một lời hỏi thăm.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <a
              href="#san-pham-noi-bat"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-rose px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose/25 transition-colors hover:bg-rose-dark"
            >
              Đặt hoa ngay
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
            <a
              href="#danh-muc"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/15 bg-white/70 px-6 py-3 text-sm font-semibold text-ink-soft backdrop-blur-md transition-colors hover:border-ink-soft"
            >
              Xem bộ sưu tập
            </a>
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs font-medium text-ink-muted">
            <svg className="h-3.5 w-3.5 text-rose" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3 2" />
            </svg>
            Mở cửa 07:00–21:00 tất cả các ngày · Hotline {HOTLINE_DISPLAY}
          </p>
        </div>

        <div className="flex flex-1 justify-center">
          <div className="relative flex h-80 w-80 items-center justify-center lg:h-[26rem] lg:w-[26rem]">
            <div className="absolute inset-6 rounded-full bg-rose-light/80 blur-3xl" />

            <div className="relative flex h-full w-full items-center justify-center rounded-[2.5rem] border border-white/80 bg-white/50 shadow-xl backdrop-blur-md">
              <FlowerIcon className="h-32 w-32" color="var(--color-rose)" />
            </div>

            {/* Thẻ nổi — nhấn 1 lợi ích cụ thể ngay trên hero, thay vì để khách tự đọc hết trang mới biết */}
            <div className="absolute -bottom-6 -left-6 flex items-center gap-3 rounded-2xl border border-border-soft bg-white px-5 py-4 shadow-xl shadow-ink/10 sm:-left-10">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-rose-light text-rose-dark">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path d="M3 6h2l2.4 12.4a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L22 8H6" />
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="18" cy="21" r="1" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Thanh toán khi nhận hoa</p>
                <p className="text-xs text-ink-muted">Không cần chuyển khoản trước</p>
              </div>
            </div>
          </div>
        </div>
      </section>

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
                  <FlowerIcon className="h-7 w-7" color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                </span>
                <span className="text-sm font-semibold text-ink group-hover:text-rose-dark">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured products */}
      <section id="san-pham-noi-bat" className="scroll-mt-28 px-8 pb-24 lg:px-16">
        <div className="mb-8">
          <p className="text-sm font-semibold tracking-widest text-rose uppercase">Gợi ý cho bạn</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-ink">Mẫu hoa được chọn nhiều</h2>
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

      {/* Vì sao chọn Hoa Xinh — đưa lợi ích cụ thể lên thành nội dung chính, không chỉ 1 dòng trên hero */}
      <section className="bg-white px-8 py-20 lg:px-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-widest text-rose uppercase">Vì sao chọn Hoa Xinh</p>
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
              href={`tel:${HOTLINE}`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-rose px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose/30 transition-colors hover:bg-rose-dark"
            >
              Gọi {HOTLINE_DISPLAY}
            </a>
            <a
              href={ZALO_LINK}
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
