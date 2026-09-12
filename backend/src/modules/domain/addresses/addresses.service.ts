import { prisma } from "../../../config/prisma";
import { AppError } from "../../../shared/errors";
import type { CreateAddressInput, UpdateAddressInput } from "./addresses.validation";

const ADDRESS_SELECT = {
  id: true,
  recipientName: true,
  recipientPhone: true,
  addressLine: true,
  ward: true,
  district: true,
  city: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
} as const;

// Dữ liệu cá nhân — không audit log (giống users.service.ts#updateProfile), khác các thao tác nghiệp
// vụ (products/categories/orders) vốn ảnh hưởng dữ liệu công khai của shop. Xem docs/12 §5.1 cho
// nguyên tắc row-level check (lọc userId NGAY trong query, không lấy hết rồi lọc).
export async function list(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: ADDRESS_SELECT,
  });
}

// Đặt mặc định: địa chỉ ĐẦU TIÊN của user tự động là mặc định (kể cả không truyền isDefault) — trải
// nghiệm hợp lý hơn là để trống, khách luôn có ít nhất 1 địa chỉ mặc định ngay khi lưu địa chỉ đầu
// tiên. Chỉ 1 địa chỉ mặc định/user — unset địa chỉ mặc định CŨ trước khi tạo cái mới (không dùng
// unique index vì Postgres không chặn được nhiều hàng cùng `true` trong 1 cột boolean thường).
export async function create(userId: string, input: CreateAddressInput) {
  const existingCount = await prisma.address.count({ where: { userId } });
  const isDefault = input.isDefault ?? existingCount === 0;

  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.address.create({
    data: {
      userId,
      recipientName: input.recipientName,
      recipientPhone: input.recipientPhone,
      addressLine: input.addressLine,
      ward: input.ward,
      district: input.district,
      city: input.city,
      isDefault,
    },
    select: ADDRESS_SELECT,
  });
}

export async function update(userId: string, id: string, input: UpdateAddressInput) {
  // Ownership check NGAY TRONG where — chống IDOR, không phải lấy theo `id` rồi so sánh userId sau.
  const existing = await prisma.address.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Địa chỉ không tồn tại", 404, "NOT_FOUND");

  if (input.isDefault === true) {
    await prisma.address.updateMany({
      where: { userId, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  return prisma.address.update({
    where: { id },
    data: {
      ...(input.recipientName !== undefined && { recipientName: input.recipientName }),
      ...(input.recipientPhone !== undefined && { recipientPhone: input.recipientPhone }),
      ...(input.addressLine !== undefined && { addressLine: input.addressLine }),
      ...(input.ward !== undefined && { ward: input.ward }),
      ...(input.district !== undefined && { district: input.district }),
      ...(input.city !== undefined && { city: input.city }),
      ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
    },
    select: ADDRESS_SELECT,
  });
}

// KHÔNG tự đôn địa chỉ khác lên làm mặc định sau khi xoá — khách tự chọn lại mặc định mới nếu cần,
// đơn giản hơn là đoán "địa chỉ nào hợp lý nhất" thay khách.
export async function remove(userId: string, id: string): Promise<void> {
  const existing = await prisma.address.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Địa chỉ không tồn tại", 404, "NOT_FOUND");

  await prisma.address.delete({ where: { id } });
}
