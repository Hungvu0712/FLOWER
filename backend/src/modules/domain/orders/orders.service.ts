import { prisma } from "../../../config/prisma";
import { AppError } from "../../../shared/errors";
import { buildPaginationMeta } from "../../../shared/response/ApiResponse";
import * as auditLog from "../../core/audit-log/auditLog.service";
import type {
  CreateOrderInput,
  ListOrdersQuery,
  UpdateOrderStatusInput,
} from "./orders.validation";

const ORDER_SELECT = {
  id: true,
  orderCode: true,
  userId: true,
  status: true,
  paymentMethod: true,
  subtotal: true,
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

  // Gộp trùng productId — khách có thể lỡ thêm cùng sản phẩm nhiều lần ở giỏ hàng phía client.
  const quantityByProductId = new Map<string, number>();
  for (const item of input.items) {
    quantityByProductId.set(
      item.productId,
      (quantityByProductId.get(item.productId) ?? 0) + item.quantity,
    );
  }

  const products = await prisma.product.findMany({
    where: { id: { in: [...quantityByProductId.keys()] }, deletedAt: null, isActive: true },
    select: { id: true, name: true, basePrice: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  const orderItemsData: {
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
  }[] = [];
  for (const [productId, quantity] of quantityByProductId) {
    const product = productById.get(productId);
    if (!product) {
      throw new AppError(
        "Một số sản phẩm trong giỏ không còn khả dụng, vui lòng tải lại giỏ hàng",
        409,
        "PRODUCT_UNAVAILABLE",
      );
    }
    const itemSubtotal = product.basePrice * quantity;
    orderItemsData.push({
      productId,
      productName: product.name,
      unitPrice: product.basePrice,
      quantity,
      subtotal: itemSubtotal,
    });
    subtotal += itemSubtotal;
  }

  const orderCode = await generateOrderCode();

  const created = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderCode,
        userId: userId ?? null,
        subtotal,
        total: subtotal,
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

  return full;
}

// Dùng chung cho cả tra cứu công khai (GET /orders/:id — id dạng UUID khó đoán đóng vai trò token, xem
// schema.prisma) lẫn xem chi tiết ở màn quản trị (GET /admin/orders/:id, có `orders.view_all`).
export async function getById(id: string) {
  const order = await prisma.order.findUnique({ where: { id }, select: ORDER_SELECT });
  if (!order) throw new AppError("Không tìm thấy đơn hàng", 404, "NOT_FOUND");
  return order;
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

  return updated;
}
