import { z } from 'zod';

// Endpoint tạo đơn công khai (guest checkout) — giới hạn độ dài như contact.validation.ts để giảm bề
// mặt spam/abuse (còn có rate limit theo IP ở orders.routes.ts).
const orderItemSchema = z.object({
  productId: z.string().uuid(),
  // Tối đa 50/dòng — hoa tươi làm theo đơn thủ công, số lượng lớn bất thường nhiều khả năng là input
  // rác hơn là nhu cầu thật; đơn thật sự lớn thì khách gọi trực tiếp thay vì qua form.
  quantity: z.number().int().min(1).max(50),
});

// 'sang' | 'chieu' | 'toi' — khung giờ giao đơn giản, đủ cho giai đoạn cơ bản (chưa cần chọn giờ chính
// xác từng khung 2 tiếng như dịch vụ giao hàng chuyên nghiệp).
export const ORDER_TIME_SLOTS = ['sang', 'chieu', 'toi'] as const;

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Giỏ hàng đang trống'),
  // Người NHẬN hoa — có thể khác người đặt (đặt hộ/tặng). Đây cũng là số điện thoại cửa hàng gọi lại
  // để xác nhận đơn (giai đoạn cơ bản chưa thu thập riêng thông tin người đặt/email — xem
  // docs/modules/domain-orders.md).
  recipientName: z.string().trim().min(1, 'Vui lòng nhập tên người nhận').max(100),
  recipientPhone: z.string().trim().min(8, 'Số điện thoại không hợp lệ').max(20),
  deliveryAddress: z.string().trim().min(1, 'Vui lòng nhập địa chỉ giao hoa').max(300),
  deliveryDate: z
    .string()
    .regex(isoDatePattern, 'Ngày giao không hợp lệ')
    .refine((v) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(`${v}T00:00:00`) >= today;
    }, 'Ngày giao phải từ hôm nay trở đi'),
  deliveryTimeSlot: z.enum(ORDER_TIME_SLOTS),
  note: z.string().trim().max(500).optional(),
  // Honeypot chống bot — field ẩn bằng CSS (không phải type="hidden") ở form thật, người dùng thật
  // không bao giờ thấy/điền được (aria-hidden + tabIndex -1 + đưa ra khỏi màn hình), bot điền form tự
  // động (không render CSS) thường điền vào MỌI field nhìn thấy trong DOM. KHÔNG validate strict ở
  // đây (chấp nhận mọi giá trị) — chỉ cần field CÓ GIÁ TRỊ hay không, kiểm tra thật ở orders.service.ts.
  // Xem docs/modules/domain-orders.md.
  website: z.string().max(200).optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const orderIdParamSchema = z.object({ id: z.string().uuid() });

export const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'delivering', 'completed', 'cancelled'] as const;

export const updateOrderStatusSchema = z.object({ status: z.enum(ORDER_STATUSES) });
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const listOrdersQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
