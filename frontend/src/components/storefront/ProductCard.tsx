import { FlowerIcon } from '@/components/ui/FlowerIcon';
import { formatVnd } from '@/lib/currency';
import { stripHtml } from '@/lib/html';
import type { StorefrontProduct } from '@/lib/storefront-api';

// Màu nền tròn thay thế cho sản phẩm CHƯA có ảnh — đổi vòng qua mảng này theo index thay vì 1 màu cố
// định, giữ chút sinh động khi nhiều sản phẩm liền kề đều chưa có ảnh thật (vd dữ liệu mẫu mới seed).
const PLACEHOLDER_COLORS = ['#c95b52', '#d69a3a', '#c17a4a', '#c98fae', '#7a9b6e', '#b3856b'];

// TODO: thay bằng hotline/Zalo THẬT của cửa hàng trước khi triển khai thật — đây chỉ là giá trị mẫu
// để dựng giao diện, giống số "0900 000 000" đã dùng trong bản mock thiết kế trước đó.
const HOTLINE = '0900000000';
const ZALO_LINK = `https://zalo.me/${HOTLINE}`;

function QuickContactOverlay({ productName }: { productName: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-2xl bg-ink/55 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100">
      <a
        href={`tel:${HOTLINE}`}
        aria-label={`Gọi đặt ${productName}`}
        className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:bg-rose hover:text-white"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 5.5c0-1.1.9-2 2-2h2.2c.5 0 .95.35 1.06.85l.9 4c.1.45-.06.9-.4 1.2l-1.7 1.4a13 13 0 0 0 5.9 5.9l1.4-1.7c.3-.34.75-.5 1.2-.4l4 .9c.5.1.85.56.85 1.06V19c0 1.1-.9 2-2 2h-1C10.8 21 3 13.2 3 3.6v-1Z" />
        </svg>
        Gọi đặt
      </a>
      <a
        href={ZALO_LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Nhắn Zalo hỏi về ${productName}`}
        className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:bg-rose hover:text-white"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15.5a2 2 0 0 1-2 2H8l-5 4V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9.5Z" />
        </svg>
        Nhắn Zalo
      </a>
    </div>
  );
}

export function ProductCard({ product, index = 0 }: { product: StorefrontProduct; index?: number }) {
  const image = product.images[0]?.file.url;
  const color = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];
  const description = product.description ? stripHtml(product.description) : null;

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl bg-white p-5">
      {/* group + relative — overlay gọi/Zalo chỉ hiện khi hover đúng vùng ảnh này (group-hover) */}
      <div className="group relative">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={product.name} className="aspect-square rounded-2xl object-cover" />
        ) : (
          <div
            className="flex aspect-square items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${color}22` }}
          >
            <FlowerIcon className="h-16 w-16" color={color} />
          </div>
        )}
        <QuickContactOverlay productName={product.name} />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-ink">{product.name}</h3>
        {description && <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{description}</p>}
      </div>
      <div className="mt-auto flex items-center justify-between">
        <span className="text-lg font-semibold text-rose">{formatVnd(product.basePrice)}</span>
        <button
          aria-label={`Thêm ${product.name} vào giỏ`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-rose text-white transition-colors hover:bg-rose-dark"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
