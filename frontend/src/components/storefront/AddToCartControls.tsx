'use client';

import { useState } from 'react';
import { useCartStore } from '@/store/useCartStore';
import { useToastStore } from '@/store/useToastStore';

type Props = {
  productId: string;
  name: string;
  slug: string;
  basePrice: number;
  image: string | null;
};

// Tách riêng khỏi trang chi tiết sản phẩm (Server Component) vì cần state (số lượng) + store giỏ
// hàng — nhận dữ liệu sản phẩm qua props thay vì tự fetch lại.
export function AddToCartControls({ productId, name, slug, basePrice, image }: Props) {
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const push = useToastStore((s) => s.push);

  function handleAdd() {
    addItem({ productId, name, slug, basePrice, image }, quantity);
    push(`Đã thêm ${quantity} "${name}" vào giỏ hàng`);
    setQuantity(1);
  }

  return (
    <div className="flex items-center gap-4">
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
  );
}
