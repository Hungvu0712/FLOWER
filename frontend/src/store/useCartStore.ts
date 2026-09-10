import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Giỏ hàng lưu Ở PHÍA CLIENT (localStorage qua `persist`), KHÔNG có bảng carts/cart_items ở backend —
// khác bản thiết kế nháp ban đầu ở docs/05 §3.4. Lý do: đơn hoa thường chỉ 1-3 sản phẩm, hiếm khi cần
// đồng bộ giỏ hàng giữa nhiều thiết bị; giỏ chỉ THỰC SỰ trở thành dữ liệu server khi bấm "Đặt hàng" —
// từ đó Order (được tạo qua POST /api/v1/orders) mới là nguồn sự thật, đúng tinh thần "Zustand chỉ giữ
// UI state" ở CLAUDE.md §5 (giỏ hàng trước khi đặt chỉ là trạng thái đang soạn, chưa phải dữ liệu đã
// chốt). Xem docs/modules/domain-orders.md.
export type CartItem = {
  productId: string;
  name: string;
  slug: string;
  basePrice: number;
  image: string | null;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  // `persist` đọc localStorage BẤT ĐỒNG BỘ (kể cả localStorage là I/O đồng bộ, middleware vẫn bọc qua
  // 1 microtask để thống nhất API với storage bất đồng bộ khác) — ngay lần render đầu, `items` LUÔN là
  // [] (mặc định) dù localStorage đã có dữ liệu, tới khi `hasHydrated` bật mới đáng tin. Component nào
  // dùng `items.length === 0` để quyết định điều hướng (vd trang /thanh-toan) BẮT BUỘC phải đợi cờ này
  // trước, nếu không sẽ tưởng nhầm giỏ hàng trống ngay sau khi mới điều hướng cứng (page.goto/F5) tới
  // trang — bug THẬT đã gặp khi test: thêm hàng xong rồi vào thẳng /thanh-toan bị đá ngược về /gio-hang.
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      addItem: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId ? { ...i, quantity: i.quantity + quantity } : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity }] };
        }),
      removeItem: (productId) => set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),
      setQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'hoa-xinh-cart',
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

export const useCartCount = () => useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
export const useCartTotal = () => useCartStore((s) => s.items.reduce((sum, i) => sum + i.basePrice * i.quantity, 0));
