import { prisma } from "../../../config/prisma";
import { AppError, ValidationError } from "../../../shared/errors";
import { buildPaginationMeta } from "../../../shared/response/ApiResponse";
import * as auditLog from "../../core/audit-log/auditLog.service";
import type {
  CreateCouponInput,
  ListCouponsQuery,
  UpdateCouponInput,
  ValidateCouponInput,
} from "./coupons.validation";

const COUPON_SELECT = {
  id: true,
  code: true,
  type: true,
  value: true,
  minOrderValue: true,
  startDate: true,
  endDate: true,
  usageLimit: true,
  usedCount: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

// Tính số tiền được giảm cho 1 subtotal — dùng CHUNG cho validate() (xem trước ở checkout) và
// orders.service.ts#create() (áp dụng thật lúc tạo đơn), đảm bảo 2 nơi luôn tính RA CÙNG một số.
// percent giảm theo % của subtotal; fixed giảm số tiền cố định nhưng KHÔNG BAO GIỜ vượt subtotal
// (đơn giá trị thấp hơn mã fixed vẫn hợp lệ, chỉ giảm tối đa bằng đúng subtotal, không âm tiền đơn).
export function computeDiscount(coupon: { type: string; value: number }, subtotal: number): number {
  const raw =
    coupon.type === "percent" ? Math.floor((subtotal * coupon.value) / 100) : coupon.value;
  // Math.min ở NGOÀI cả 2 nhánh — chốt an toàn cuối cùng, không tin riêng validate() đã chặn đủ ở
  // update() bên dưới (vd dữ liệu cũ lỡ lọt vào DB từ trước khi có kiểm tra này). Không bao giờ giảm
  // vượt subtotal dù type/value có sai lệch thế nào (review VAL-01).
  return Math.min(raw, subtotal);
}

// Kiểm tra 1 mã có áp dụng ĐƯỢC cho subtotal hiện tại không — dùng chung cho endpoint public
// (validate, khách xem trước ở /thanh-toan) và orders.service.ts#create() (áp dụng thật). Không tự
// tăng usedCount ở đây — chỉ orders.service.ts mới tăng, TRONG transaction tạo đơn, để tránh race
// condition giữa lúc validate và lúc đặt hàng thật.
export async function checkCoupon(code: string, subtotal: number) {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon) throw new AppError("Mã giảm giá không tồn tại", 404, "COUPON_NOT_FOUND");
  if (!coupon.isActive) throw new AppError("Mã giảm giá đã bị tạm ngưng", 409, "COUPON_INACTIVE");

  const now = new Date();
  if (coupon.startDate && now < coupon.startDate) {
    throw new AppError("Mã giảm giá chưa tới ngày áp dụng", 409, "COUPON_NOT_STARTED");
  }
  if (coupon.endDate && now > coupon.endDate) {
    throw new AppError("Mã giảm giá đã hết hạn", 409, "COUPON_EXPIRED");
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError("Mã giảm giá đã hết lượt sử dụng", 409, "COUPON_USAGE_LIMIT_REACHED");
  }
  if (coupon.minOrderValue !== null && subtotal < coupon.minOrderValue) {
    throw new AppError(
      `Đơn hàng cần tối thiểu ${coupon.minOrderValue.toLocaleString("vi-VN")}đ để dùng mã này`,
      409,
      "COUPON_MIN_ORDER_NOT_MET",
    );
  }

  return { coupon, discountAmount: computeDiscount(coupon, subtotal) };
}

// Công khai — khách xem trước số tiền được giảm ở /thanh-toan TRƯỚC khi bấm đặt hàng thật.
export async function validate({ code, subtotal }: ValidateCouponInput) {
  const { coupon, discountAmount } = await checkCoupon(code, subtotal);
  return { code: coupon.code, type: coupon.type, value: coupon.value, discountAmount };
}

export async function listAdmin({ includeInactive, page, limit }: ListCouponsQuery) {
  const where = { ...(!includeInactive && { isActive: true }) };
  const [items, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: COUPON_SELECT,
    }),
    prisma.coupon.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function getById(id: string) {
  const coupon = await prisma.coupon.findUnique({ where: { id }, select: COUPON_SELECT });
  if (!coupon) throw new AppError("Mã giảm giá không tồn tại", 404, "NOT_FOUND");
  return coupon;
}

export async function create(actorId: string, input: CreateCouponInput, ipAddress?: string) {
  const code = input.code.toUpperCase();
  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) throw new AppError("Mã giảm giá này đã tồn tại", 409, "COUPON_CODE_EXISTS");

  const coupon = await prisma.coupon.create({
    data: {
      code,
      type: input.type,
      value: input.value,
      minOrderValue: input.minOrderValue,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      usageLimit: input.usageLimit,
      isActive: input.isActive ?? true,
    },
    select: COUPON_SELECT,
  });

  await auditLog.record({
    actorId,
    action: "coupon.create",
    entityType: "coupon",
    entityId: coupon.id,
    after: coupon,
    ...(ipAddress && { ipAddress }),
  });

  return coupon;
}

export async function update(
  actorId: string,
  id: string,
  input: UpdateCouponInput,
  ipAddress?: string,
) {
  const before = await prisma.coupon.findUnique({ where: { id } });
  if (!before) throw new AppError("Mã giảm giá không tồn tại", 404, "NOT_FOUND");

  // Validate lại theo BẢN GHI SAU KHI MERGE, không chỉ field có mặt trong request này — zod ở route
  // (coupons.validation.ts) chỉ xét field THỰC SỰ GỬI LÊN, không biết record hiện tại trong DB. PATCH
  // {value: 500} lên 1 mã ĐANG có sẵn type "percent" nhưng không gửi kèm type sẽ lọt qua zod (coi
  // "chưa gửi type" = "không phải percent"), ghi thẳng value=500 vào DB dù type thật vẫn là percent —
  // computeDiscount() sau đó giảm 500% đơn hàng (review VAL-01, 24/09/2026).
  const mergedType = input.type ?? before.type;
  const mergedValue = input.value ?? before.value;
  if (mergedType === "percent" && mergedValue > 100) {
    throw new ValidationError({ value: "Mã giảm theo % phải từ 1 đến 100" });
  }

  if (input.code) {
    const code = input.code.toUpperCase();
    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing && existing.id !== id) {
      throw new AppError("Mã giảm giá này đã tồn tại", 409, "COUPON_CODE_EXISTS");
    }
  }

  const updated = await prisma.coupon.update({
    where: { id },
    data: {
      ...(input.code && { code: input.code.toUpperCase() }),
      ...(input.type && { type: input.type }),
      ...(input.value !== undefined && { value: input.value }),
      ...(input.minOrderValue !== undefined && { minOrderValue: input.minOrderValue }),
      ...(input.startDate !== undefined && {
        startDate: input.startDate ? new Date(input.startDate) : null,
      }),
      ...(input.endDate !== undefined && {
        endDate: input.endDate ? new Date(input.endDate) : null,
      }),
      ...(input.usageLimit !== undefined && { usageLimit: input.usageLimit }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
    select: COUPON_SELECT,
  });

  await auditLog.record({
    actorId,
    action: "coupon.update",
    entityType: "coupon",
    entityId: id,
    before,
    after: updated,
    ...(ipAddress && { ipAddress }),
  });

  return updated;
}

// Xoá THẬT (không soft-delete, khác products/categories) — mã giảm giá không có quan hệ hiển thị
// công khai nào cần giữ lại lịch sử khi xoá. Chặn xoá khi ĐÃ TỪNG dùng (usedCount > 0) vì
// coupon_usages tham chiếu coupon_id — xoá sẽ CASCADE xoá luôn lịch sử dùng mã của các đơn đã đặt.
export async function remove(actorId: string, id: string, ipAddress?: string): Promise<void> {
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) throw new AppError("Mã giảm giá không tồn tại", 404, "NOT_FOUND");
  if (coupon.usedCount > 0) {
    throw new AppError(
      "Mã giảm giá đã được sử dụng, không thể xoá — có thể tạm ngưng thay vì xoá",
      409,
      "COUPON_IN_USE",
    );
  }

  await prisma.coupon.delete({ where: { id } });
  await auditLog.record({
    actorId,
    action: "coupon.delete",
    entityType: "coupon",
    entityId: id,
    before: coupon,
    ...(ipAddress && { ipAddress }),
  });
}
