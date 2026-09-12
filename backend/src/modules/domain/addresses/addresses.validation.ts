import { z } from "zod";

export const createAddressSchema = z.object({
  recipientName: z.string().trim().min(1, "Vui lòng nhập tên người nhận").max(100),
  recipientPhone: z.string().trim().min(8, "Số điện thoại không hợp lệ").max(20),
  addressLine: z.string().trim().min(1, "Vui lòng nhập địa chỉ").max(255),
  ward: z.string().trim().max(100).optional(),
  district: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  isDefault: z.boolean().optional(),
});
export type CreateAddressInput = z.infer<typeof createAddressSchema>;

export const updateAddressSchema = createAddressSchema.partial();
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;

export const addressIdParamSchema = z.object({ id: z.string().uuid() });
