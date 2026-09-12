import { prisma } from "../../../config/prisma";
import { AppError } from "../../../shared/errors";
import { buildPaginationMeta } from "../../../shared/response/ApiResponse";
import * as auditLog from "../../core/audit-log/auditLog.service";
import { computeDiscount } from "../coupons/coupons.service";
import { emitOrderCreated, emitOrderStatusChanged } from "./orders.realtime";
import type {
  CreateOrderInput,
  ListDeliveryQueueQuery,
  ListOrdersQuery,
  ListOwnOrdersQuery,
  UpdateOrderStatusInput,
} from "./orders.validation";

// Thứ tự hiển thị khung giờ trong ngày — Prisma không sắp được theo thứ tự tuỳ ý cho cột string kiểu
// enum-like ('sang'|'chieu'|'toi' không theo thứ tự bảng chữ cái mong muốn), nên sort lại ở tầng ứng
// dụng sau khi lấy dữ liệu (xem listDeliveryQueue).
const TIME_SLOT_ORDER: Record<string, number> = { sang: 0, chieu: 1, toi: 2 };

const ORDER_SELECT = {
  id: true,
  orderCode: true,
  userId: true,
  status: true,
  paymentMethod: true,
  subtotal: true,
  couponCode: true,
  discountAmount: true,
  total: true,
  recipientName: true,
  recipientPhone: true,
  deliveryAddress: true,
  deliveryDate: true,
  deliveryTimeSlot: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      productId: true,
      productName: true,
      variantId: true,
      variantName: true,
      unitPrice: true,
      quantity: true,
      subtotal: true,
    },
  },
} as const;

// 'completed'/'cancelled' — không cho đổi trạng thái tiếp sau 2 mốc này (state machine đơn giản cho
// giai đoạn cơ bản, xem docs/modules/domain-orders.md).
const TERMINAL_STATUSES = ["completed", "cancelled"];

async function generateOrderCode(): Promise<string> {
  const now = new Date();
  const datePart = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  for (;;) {
    const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    const code = `HX${datePart}${suffix}`;
    const existing = await prisma.order.findUnique({ where: { orderCode: code } });
    if (!existing) return code;
  }
}

// Guest checkout (userId optional — có đăng nhập thì gắn đơn vào tài khoản, không thì vẫn đặt được
// bình thường). Chốt tên/giá sản phẩm NGAY thời điểm đặt (snapshot vào order_items) — sản phẩm sau
// này đổi tên/giá/bị ẩn không ảnh hưởng đơn đã tạo.
export async function create(
  input: CreateOrderInput,
  userId: string | undefined,
  ipAddress?: string,
) {
  // Honeypot — bot điền form tự động thường điền vào MỌI field nhìn thấy trong DOM, kể cả field ẩn
  // bằng CSS (khác type="hidden" mà bot có thể lọc ra), người dùng thật không bao giờ điền được field
  // này (xem input `website` tương ứng ở thanh-toan/page.tsx). Bail NGAY, trước khi đụng DB — vừa chặn
  // spam vừa đỡ tải khi bot dội request hàng loạt. Không phân biệt lỗi này với lỗi khác để không "dạy"
  // bot biết chính xác vì sao bị chặn.
  // KHÔNG trim trước khi kiểm tra — người dùng thật không bao giờ chạm vào field này nên giá trị luôn
  // là '' (rỗng thật sự) hoặc undefined; dù bot chỉ điền 1 khoảng trắng cũng đủ khác biệt để coi là bot.
  if (input.website) {
    throw new AppError("Yêu cầu không hợp lệ", 422, "INVALID_SUBMISSION");
  }

  // Gộp trùng productId+variantId — khách có thể lỡ thêm cùng sản phẩm (cùng biến thể) nhiều lần ở
  // giỏ hàng phía client. Cùng productId nhưng KHÁC variantId là 2 dòng riêng (khác giá), không gộp.
  const quantityByKey = new Map<
    string,
    { productId: string; variantId?: string; quantity: number }
  >();
  for (const item of input.items) {
    const key = `${item.productId}::${item.variantId ?? ""}`;
    const existing = quantityByKey.get(key);
    if (existing) existing.quantity += item.quantity;
    else quantityByKey.set(key, { ...item });
  }

  const products = await prisma.product.findMany({
    where: {
      id: { in: [...new Set([...quantityByKey.values()].map((v) => v.productId))] },
      deletedAt: null,
      isActive: true,
    },
    select: { id: true, name: true, basePrice: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  const variantIds = [...quantityByKey.values()].flatMap((v) => (v.variantId ? [v.variantId] : []));
  const variants = variantIds.length
    ? await prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: { id: true, productId: true, name: true, price: true },
      })
    : [];
  const variantById = new Map(variants.map((v) => [v.id, v]));

  let subtotal = 0;
  const orderItemsData: {
    productId: string;
    productName: string;
    variantId: string | undefined;
    variantName: string | undefined;
    unitPrice: number;
    quantity: number;
    subtotal: number;
  }[] = [];
  for (const { productId, variantId, quantity } of quantityByKey.values()) {
    const product = productById.get(productId);
    // variant phải thuộc ĐÚNG productId đang xét — chặn khách (hoặc client bị lỗi/giả mạo) gửi
    // variantId của sản phẩm KHÁC kèm productId này, sẽ tính nhầm giá.
    const variant = variantId ? variantById.get(variantId) : undefined;
    if (!product || (variantId && (!variant || variant.productId !== productId))) {
      throw new AppError(
        "Một số sản phẩm trong giỏ không còn khả dụng, vui lòng tải lại giỏ hàng",
        409,
        "PRODUCT_UNAVAILABLE",
      );
    }
    const unitPrice = variant ? variant.price : product.basePrice;
    const itemSubtotal = unitPrice * quantity;
    orderItemsData.push({
      productId,
      productName: product.name,
      variantId: variant?.id,
      variantName: variant?.name,
      unitPrice,
      quantity,
      subtotal: itemSubtotal,
    });
    subtotal += itemSubtotal;
  }

  const orderCode = await generateOrderCode();

  const created = await prisma.$transaction(async (tx) => {
    // Re-validate mã giảm giá NGAY TRONG transaction (không tin kết quả POST /coupons/validate gọi
    // trước đó ở client — có thể đã lỗi thời do coupon bị sửa/hết lượt giữa lúc khách xem trước và
    // lúc bấm đặt hàng thật). Tăng usedCount bằng updateMany có điều kiện (WHERE usedCount < limit)
    // NGAY TRONG transaction này — Postgres khoá row khi UPDATE nên 2 request cùng dùng mã còn ĐÚNG 1
    // lượt cuối tại cùng thời điểm sẽ tuần tự hoá qua khoá row, không thể cả 2 cùng "lọt qua".
    let discountAmount = 0;
    let couponCode: string | undefined;
    let couponId: string | undefined;
    if (input.couponCode) {
      const code = input.couponCode.trim().toUpperCase();
      const coupon = await tx.coupon.findUnique({ where: { code } });
      if (!coupon) throw new AppError("Mã giảm giá không tồn tại", 404, "COUPON_NOT_FOUND");
      if (!coupon.isActive) {
        throw new AppError("Mã giảm giá đã bị tạm ngưng", 409, "COUPON_INACTIVE");
      }
      const now = new Date();
      if (coupon.startDate && now < coupon.startDate) {
        throw new AppError("Mã giảm giá chưa tới ngày áp dụng", 409, "COUPON_NOT_STARTED");
      }
      if (coupon.endDate && now > coupon.endDate) {
        throw new AppError("Mã giảm giá đã hết hạn", 409, "COUPON_EXPIRED");
      }
      if (coupon.minOrderValue !== null && subtotal < coupon.minOrderValue) {
        throw new AppError(
          `Đơn hàng cần tối thiểu ${coupon.minOrderValue.toLocaleString("vi-VN")}đ để dùng mã này`,
          409,
          "COUPON_MIN_ORDER_NOT_MET",
        );
      }

      const guarded = await tx.coupon.updateMany({
        where: {
          id: coupon.id,
          OR: [{ usageLimit: null }, { usedCount: { lt: coupon.usageLimit ?? 0 } }],
        },
        data: { usedCount: { increment: 1 } },
      });
      if (guarded.count === 0) {
        throw new AppError("Mã giảm giá đã hết lượt sử dụng", 409, "COUPON_USAGE_LIMIT_REACHED");
      }

      discountAmount = computeDiscount(coupon, subtotal);
      couponCode = coupon.code;
      couponId = coupon.id;
    }

    const order = await tx.order.create({
      data: {
        orderCode,
        userId: userId ?? null,
        subtotal,
        couponCode,
        discountAmount,
        total: subtotal - discountAmount,
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone,
        deliveryAddress: input.deliveryAddress,
        // LUÔN neo giờ UTC ('...Z') khi tạo Date cho cột @db.Date — nếu dùng giờ LOCAL của server
        // (múi giờ Asia/Saigon, UTC+7) thì Postgres sẽ lưu NHẦM SANG NGÀY HÔM TRƯỚC khi ghi cột DATE
        // (00:00 giờ VN = 17:00 UTC hôm trước). Bug THẬT đã xảy ra khi test thủ công: gửi
        // deliveryDate "2026-12-25" nhưng DB lưu "2026-12-24".
        deliveryDate: new Date(`${input.deliveryDate}T00:00:00.000Z`),
        deliveryTimeSlot: input.deliveryTimeSlot,
        note: input.note,
      },
    });
    await tx.orderItem.createMany({
      data: orderItemsData.map((item) => ({ ...item, orderId: order.id })),
    });
    if (couponId) {
      await tx.couponUsage.create({
        data: {
          couponId,
          orderId: order.id,
          userId: userId ?? null,
          discountAmount,
        },
      });
    }
    return order;
  });

  const full = await prisma.order.findUniqueOrThrow({
    where: { id: created.id },
    select: ORDER_SELECT,
  });

  await auditLog.record({
    ...(userId && { actorId: userId }),
    action: "order.create",
    entityType: "order",
    entityId: created.id,
    after: full,
    ...(ipAddress && { ipAddress }),
  });

  emitOrderCreated(full);

  return full;
}

// Dùng chung cho cả tra cứu công khai (GET /orders/:id — id dạng UUID khó đoán đóng vai trò token, xem
// schema.prisma) lẫn xem chi tiết ở màn quản trị (GET /admin/orders/:id, có `orders.view_all`).
export async function getById(id: string) {
  const order = await prisma.order.findUnique({ where: { id }, select: ORDER_SELECT });
  if (!order) throw new AppError("Không tìm thấy đơn hàng", 404, "NOT_FOUND");
  return order;
}

// docs/12 §5.1 — row-level check: lọc NGAY trong câu truy vấn (`where: { userId }`) thay vì lấy hết
// rồi lọc ở tầng ứng dụng — không có đường nào để 1 khách nhìn thấy đơn của khách khác, kể cả nếu
// service có bug ở chỗ khác sau này (đúng nguyên tắc chống IDOR: không tin dữ liệu trả về, tự giới
// hạn phạm vi truy vấn ngay từ đầu). Đơn guest checkout (userId null) không hiện ở đây — khách vãng
// lai tra cứu qua link `/don-hang/:id` đã lưu, không qua danh sách này.
export async function listOwn(userId: string, { page, limit }: ListOwnOrdersQuery) {
  const where = { userId };
  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: ORDER_SELECT,
    }),
    prisma.order.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

// Lịch giao hoa theo ngày — dùng permission RIÊNG `orders.view_delivery_queue` (florist có, nhưng
// KHÔNG có `orders.view_all` — florist chỉ cần thấy đơn cần soạn hoa của 1 ngày, không cần/không nên
// thấy toàn bộ lịch sử đơn hệ thống). Loại `cancelled` — đơn đã huỷ không cần soạn hoa; GIỮ LẠI mọi
// trạng thái khác (kể cả `pending` chưa xác nhận) để florist thấy bức tranh đầy đủ trong ngày.
export async function listDeliveryQueue({ date }: ListDeliveryQueueQuery) {
  const deliveryDate = new Date(`${date}T00:00:00.000Z`); // xem create() — LUÔN neo giờ UTC cho cột @db.Date
  const orders = await prisma.order.findMany({
    where: { deliveryDate, status: { not: "cancelled" } },
    orderBy: { createdAt: "asc" },
    select: ORDER_SELECT,
  });
  return [...orders].sort(
    (a, b) => TIME_SLOT_ORDER[a.deliveryTimeSlot]! - TIME_SLOT_ORDER[b.deliveryTimeSlot]!,
  );
}

export async function listAdmin({ status, page, limit }: ListOrdersQuery) {
  const where = { ...(status && { status }) };
  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: ORDER_SELECT,
    }),
    prisma.order.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

// Quyền phụ thuộc GIÁ TRỊ status mới (huỷ đơn cần `orders.cancel`, các trạng thái khác cần
// `orders.update_status` — đúng ma trận docs/05 §2.4) nên không thể chặn bằng router-level
// `authorize()` một permission cố định như các route khác — kiểm tra ngay trong service, nhận vào
// permissions của actor thay vì tự đọc `req` (service không đụng req/res, xem CLAUDE.md §5).
export async function updateStatus(
  actorId: string,
  id: string,
  newStatus: UpdateOrderStatusInput["status"],
  actorPermissions: string[],
  ipAddress?: string,
) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new AppError("Đơn hàng không tồn tại", 404, "NOT_FOUND");

  if (TERMINAL_STATUSES.includes(order.status)) {
    throw new AppError(
      "Đơn đã ở trạng thái cuối (hoàn tất/đã huỷ), không thể đổi tiếp",
      409,
      "ORDER_STATUS_FINAL",
    );
  }

  if (newStatus === "cancelled") {
    if (!actorPermissions.includes("orders.cancel")) {
      throw new AppError("Bạn không có quyền huỷ đơn hàng", 403, "FORBIDDEN");
    }
    if (order.status === "delivering") {
      throw new AppError("Đơn đang giao, không thể huỷ", 409, "ORDER_CANNOT_CANCEL");
    }
  } else if (!actorPermissions.includes("orders.update_status")) {
    throw new AppError("Bạn không có quyền cập nhật trạng thái đơn", 403, "FORBIDDEN");
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: newStatus },
    select: ORDER_SELECT,
  });

  await auditLog.record({
    actorId,
    action: "order.update_status",
    entityType: "order",
    entityId: id,
    before: { status: order.status },
    after: { status: newStatus },
    ...(ipAddress && { ipAddress }),
  });

  emitOrderStatusChanged(updated);

  return updated;
}
