import { api } from '@/lib/axios';

export type OrderStatus =
  'pending' | 'confirmed' | 'preparing' | 'delivering' | 'completed' | 'cancelled';
export type OrderTimeSlot = 'sang' | 'chieu' | 'toi';

export type OrderItem = {
  id: string;
  productId: string | null;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

export type Order = {
  id: string;
  orderCode: string;
  userId: string | null;
  status: OrderStatus;
  paymentMethod: string;
  subtotal: number;
  couponCode: string | null;
  discountAmount: number;
  total: number;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  deliveryDate: string;
  deliveryTimeSlot: OrderTimeSlot;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

export type CreateOrderInput = {
  items: { productId: string; variantId?: string; quantity: number }[];
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  deliveryDate: string; // 'YYYY-MM-DD'
  deliveryTimeSlot: OrderTimeSlot;
  note?: string;
  // Mã giảm giá đã được xác nhận hợp lệ qua couponsService.validate() ở trang thanh-toán — backend
  // vẫn re-validate lại THẬT trong cùng transaction tạo đơn (xem docs/modules/domain-coupons.md).
  couponCode?: string;
  // Honeypot chống bot — input ẩn bằng CSS trong thanh-toan/page.tsx, người dùng thật không bao giờ
  // điền được. Backend coi CÓ giá trị (kể cả chỉ khoảng trắng) là dấu hiệu bot, xem orders.service.ts.
  website?: string;
};

export type PaginationMeta = { page: number; limit: number; total: number; totalPages: number };

// Dùng chung cho trang xác nhận đơn (public) và màn quản trị đơn hàng — khớp đúng
// ORDER_STATUSES/ORDER_TIME_SLOTS ở backend orders.validation.ts.
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị hoa',
  delivering: 'Đang giao',
  completed: 'Hoàn tất',
  cancelled: 'Đã huỷ',
};

export const ORDER_TIME_SLOT_LABELS: Record<OrderTimeSlot, string> = {
  sang: 'Sáng (8:00–11:00)',
  chieu: 'Chiều (13:00–17:00)',
  toi: 'Tối (17:00–20:00)',
};

export const ordersService = {
  // Công khai (guest checkout) — không qua /admin. Trả thẳng Order vừa tạo (khác products/categories
  // service chỉ trả axios response thô) vì trang checkout cần `id` để chuyển sang trang xác nhận ngay.
  create: (input: CreateOrderInput) =>
    api.post<{ data: Order }>('/api/v1/orders', input).then((r) => r.data.data),

  // Trang xác nhận đơn (public, không cần đăng nhập) đọc qua lib/storefront-api.ts (Server Component,
  // `fetch` gốc) chứ không qua đây — xem comment ở lib/storefront-api.ts.
  listAdmin: (params?: { status?: OrderStatus; page?: number; limit?: number }) =>
    api
      .get<{ data: Order[]; meta: PaginationMeta }>('/api/v1/admin/orders', { params })
      .then((r) => r.data),

  // Danh sách admin đã trả sẵn `items` của từng đơn (ORDER_SELECT) — khi mở rộng 1 dòng để xem/đổi
  // trạng thái, KHÔNG cần gọi thêm API riêng, dùng luôn dữ liệu đã có trong danh sách.
  updateStatus: (id: string, status: OrderStatus) =>
    api
      .patch<{ data: Order }>(`/api/v1/admin/orders/${id}/status`, { status })
      .then((r) => r.data.data),

  // Lịch giao hoa theo ngày (dashboard florist) — permission RIÊNG orders.view_delivery_queue, KHÔNG
  // phân trang (trả thẳng mảng, xem orders.service.ts backend).
  listDeliveryQueue: (date: string) =>
    api
      .get<{ data: Order[] }>('/api/v1/admin/orders/delivery-queue', { params: { date } })
      .then((r) => r.data.data),
};
