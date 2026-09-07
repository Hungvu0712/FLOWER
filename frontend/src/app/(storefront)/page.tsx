import Link from 'next/link';
import { FlowerIcon } from '@/components/ui/FlowerIcon';
import { Button } from '@/components/ui/Button';

// Dữ liệu mẫu — thay bằng API thật khi module domain `products` được triển khai
// (xem ARCHITECTURE.md §2, DATABASE.md §3.4).
const CATEGORIES = ['Sinh nhật', 'Khai trương', 'Cưới hỏi', 'Chia buồn'];

const PRODUCTS = [
  { name: 'Bó hồng đỏ Passion', desc: '12 bông hồng Ecuador', price: '450.000₫', color: '#c95b52' },
  { name: 'Giỏ hướng dương nắng', desc: 'Giỏ mây tự nhiên', price: '380.000₫', color: '#d69a3a' },
  { name: 'Lẵng khai trương Phú Quý', desc: 'Cao 1m2, kèm dải lụa', price: '1.250.000₫', color: '#c17a4a' },
  { name: 'Cầm tay cô dâu Ivory', desc: 'Hoa mẫu đơn & baby', price: '620.000₫', color: '#c98fae' },
];

export default function StorefrontHomePage() {
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
      <section className="flex flex-wrap gap-3 px-8 pb-14 lg:px-16">
        {CATEGORIES.map((cat) => (
          <span
            key={cat}
            className="rounded-full border border-border bg-white px-6 py-2.5 text-sm font-medium text-ink-soft"
          >
            {cat}
          </span>
        ))}
      </section>

      {/* Featured products */}
      <section className="px-8 pb-24 lg:px-16">
        <div className="mb-8 flex items-baseline justify-between">
          <h2 className="font-display text-3xl font-semibold text-ink">Hoa bán chạy</h2>
          <Link href="/" className="text-sm font-semibold text-rose hover:text-rose-dark">
            Xem tất cả →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.map((p) => (
            <div key={p.name} className="flex flex-col gap-3.5 rounded-2xl bg-white p-5">
              <div className="flex aspect-square items-center justify-center rounded-2xl" style={{ backgroundColor: `${p.color}22` }}>
                <FlowerIcon className="h-16 w-16" color={p.color} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-ink">{p.name}</h3>
                <p className="mt-1 text-sm text-ink-muted">{p.desc}</p>
              </div>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-lg font-semibold text-rose">{p.price}</span>
                <button
                  aria-label={`Thêm ${p.name} vào giỏ`}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-rose text-white transition-colors hover:bg-rose-dark"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
