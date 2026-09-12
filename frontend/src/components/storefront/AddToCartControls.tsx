'use client';

import { useState } from 'react';
import { useCartStore } from '@/store/useCartStore';
import { useToastStore } from '@/store/useToastStore';
import { formatVnd } from '@/lib/currency';

type Variant = { id: string; name: string; price: number };

type Props = {
  productId: string;
  name: string;
  slug: string;
  basePrice: number;
  // Mảng rỗng = sản phẩm không có biến thể, dùng thẳng basePrice — xem docs/05 §3.4.
  variants: Variant[];
  image: string | null;
};

// Tách riêng khỏi trang chi tiết sản phẩm (Server Component) vì cần state (số lượng, biến thể đã
// chọn) + store giỏ hàng — nhận dữ liệu sản phẩm qua props thay vì tự fetch lại. Giá hiển thị ở đây
// (không phải ở page.tsx) vì giá phụ thuộc biến thể ĐANG CHỌN — trạng thái client, không tĩnh được.
export function AddToCartControls({ productId, name, slug, basePrice, variants, image }: Props) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants[0]?.id ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const push = useToastStore((s) => s.push);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;
  const unitPrice = selectedVariant ? selectedVariant.price : basePrice;

  function handleAdd() {
    addItem(
      {
        productId,
        name,
        slug,
        unitPrice,
        ...(selectedVariant && {
          variantId: selectedVariant.id,
          variantName: selectedVariant.name,
        }),
        image,
      },
      quantity,
    );
    const label = selectedVariant ? `${name} - ${selectedVariant.name}` : name;
    push(`Đã thêm ${quantity} "${label}" vào giỏ hàng`);
    setQuantity(1);
  }

  return (
    <div>
      <p className="text-3xl font-semibold text-rose">{formatVnd(unitPrice)}</p>

      {variants.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-ink-muted">Kích cỡ</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVariantId(v.id)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  v.id === selectedVariantId
                    ? 'border-rose bg-rose text-white'
                    : 'border-border text-ink-soft hover:border-rose hover:text-rose'
                }`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center gap-4">
        <div className="flex items-center rounded-full border border-border">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Giảm số lượng"
            className="flex h-11 w-11 items-center justify-center text-ink-soft hover:text-rose"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-semibold text-ink">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(50, q + 1))}
            aria-label="Tăng số lượng"
            className="flex h-11 w-11 items-center justify-center text-ink-soft hover:text-rose"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex flex-1 items-center justify-center rounded-full bg-rose px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose/25 transition-colors hover:bg-rose-dark"
        >
          Thêm vào giỏ hàng
        </button>
      </div>
    </div>
  );
}
