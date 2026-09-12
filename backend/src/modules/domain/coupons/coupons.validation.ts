import { z } from "zod";
import { zBooleanQuery } from "../../../shared/utils/zBooleanQuery";

export const COUPON_TYPES = ["percent", "fixed"] as const;

// Mã lưu HOA (chuẩn hoá ở service trước khi ghi/so khớp) — khách gõ thường/hoa lẫn lộn đều khớp được.
const codeSchema = z
  .string()
  .trim()
  .min(3, "Mã tối thiểu 3 ký tự")
  .max(30, "Mã tối đa 30 ký tự")
  .regex(/^[A-Za-z0-9_-]+$/, "Mã chỉ gồm chữ, số, gạch ngang/gạch dưới");

export const createCouponSchema = z
  .object({
    code: codeSchema,
    type: z.enum(COUPON_TYPES),
    value: z.number().int().positive(),
    minOrderValue: z.number().int().nonnegative().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    usageLimit: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.type !== "percent" || v.value <= 100, {
    message: "Giảm theo % tối đa 100",
    path: ["value"],
  })
  .refine((v) => !v.startDate || !v.endDate || new Date(v.startDate) < new Date(v.endDate), {
    message: "Ngày kết thúc phải sau ngày bắt đầu",
    path: ["endDate"],
  });
export type CreateCouponInput = z.infer<typeof createCouponSchema>;

// KHÔNG dùng .partial() trực tiếp trên createCouponSchema (đã là ZodEffects sau .refine(), không có
// .partial()) — định nghĩa lại object gốc rồi partial(), refine riêng cho update.
const couponFieldsSchema = z.object({
  code: codeSchema,
  type: z.enum(COUPON_TYPES),
  value: z.number().int().positive(),
  minOrderValue: z.number().int().nonnegative().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  usageLimit: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});
export const updateCouponSchema = couponFieldsSchema
  .partial()
  .refine((v) => v.type !== "percent" || v.value === undefined || v.value <= 100, {
    message: "Giảm theo % tối đa 100",
    path: ["value"],
  });
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;

export const couponIdParamSchema = z.object({ id: z.string().uuid() });

export const listCouponsQuerySchema = z.object({
  includeInactive: zBooleanQuery(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});
export type ListCouponsQuery = z.infer<typeof listCouponsQuerySchema>;

// Công khai — khách nhập mã ở trang thanh toán, xem trước số tiền được giảm TRƯỚC khi đặt hàng thật.
export const validateCouponSchema = z.object({
  code: z.string().trim().min(1, "Vui lòng nhập mã giảm giá"),
  subtotal: z.number().int().nonnegative(),
});
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
