import { prisma } from "../../../config/prisma";
import { AppError } from "../../../shared/errors";
import type { CreateSpecialDateInput, UpdateSpecialDateInput } from "./specialDates.validation";

const SPECIAL_DATE_SELECT = {
  id: true,
  label: true,
  date: true,
  remindDaysBefore: true,
  createdAt: true,
  updatedAt: true,
} as const;

// Dữ liệu cá nhân — không audit log (giống addresses.service.ts). Xem docs/12 §5.1 cho nguyên tắc
// row-level check (lọc userId NGAY trong query).
export async function list(userId: string) {
  return prisma.specialDate.findMany({
    where: { userId },
    orderBy: { date: "asc" },
    select: SPECIAL_DATE_SELECT,
  });
}

export async function create(userId: string, input: CreateSpecialDateInput) {
  return prisma.specialDate.create({
    data: {
      userId,
      label: input.label,
      // LUÔN neo giờ UTC ('...Z') khi tạo Date cho cột @db.Date — giống orders.service.ts
      // (deliveryDate) — dùng giờ LOCAL của server (múi giờ Asia/Saigon, UTC+7) sẽ lưu NHẦM SANG
      // NGÀY HÔM TRƯỚC khi ghi cột DATE.
      date: new Date(`${input.date}T00:00:00.000Z`),
      remindDaysBefore: input.remindDaysBefore ?? 3,
    },
    select: SPECIAL_DATE_SELECT,
  });
}

export async function update(userId: string, id: string, input: UpdateSpecialDateInput) {
  // Ownership check NGAY TRONG where — chống IDOR, không phải lấy theo `id` rồi so sánh userId sau.
  const existing = await prisma.specialDate.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Không tìm thấy ngày đặc biệt", 404, "NOT_FOUND");

  return prisma.specialDate.update({
    where: { id },
    data: {
      ...(input.label !== undefined && { label: input.label }),
      ...(input.date !== undefined && { date: new Date(`${input.date}T00:00:00.000Z`) }),
      ...(input.remindDaysBefore !== undefined && { remindDaysBefore: input.remindDaysBefore }),
      // Đổi ngày/số ngày nhắc trước → reset lastRemindedYear, coi như dịp CHƯA từng được nhắc — tránh
      // trường hợp khách sửa ngày sinh nhật sau khi đã lỡ nhận nhắc năm nay, rồi mất luôn lượt nhắc
      // của ngày MỚI trong năm nay vì cột này vẫn còn giá trị của lượt nhắc theo ngày CŨ.
      ...((input.date !== undefined || input.remindDaysBefore !== undefined) && {
        lastRemindedYear: null,
      }),
    },
    select: SPECIAL_DATE_SELECT,
  });
}

export async function remove(userId: string, id: string): Promise<void> {
  const existing = await prisma.specialDate.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Không tìm thấy ngày đặc biệt", 404, "NOT_FOUND");

  await prisma.specialDate.delete({ where: { id } });
}
