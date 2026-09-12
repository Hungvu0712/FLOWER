import { prisma } from "../../../config/prisma";
import { AppError } from "../../../shared/errors";
import { buildPaginationMeta } from "../../../shared/response/ApiResponse";
import * as auditLog from "../../core/audit-log/auditLog.service";
import type { ListNewsletterQuery } from "./newsletter.validation";

// Đăng ký nhận email — idempotent: đăng ký lại email đã đăng ký (isActive: true) không lỗi, không
// tạo trùng dòng (unique constraint ở DB); đăng ký lại email ĐÃ unsubscribe thì bật lại (resubscribe),
// KHÔNG tạo dòng mới — giữ nguyên lịch sử subscribedAt gốc không cần thiết ở giai đoạn này nên ghi đè
// luôn cho đơn giản. Không cần chống dò email (khác forgotPassword) — khách tự nhập email CHÍNH HỌ,
// không có ai "dò" được thông tin nhạy cảm qua response này.
export async function subscribe(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email: normalized } });

  if (!existing) {
    await prisma.newsletterSubscriber.create({ data: { email: normalized } });
  } else if (!existing.isActive) {
    await prisma.newsletterSubscriber.update({
      where: { id: existing.id },
      data: { isActive: true, subscribedAt: new Date(), unsubscribedAt: null },
    });
  }
  // existing && isActive → đã đăng ký rồi, không làm gì thêm (idempotent).
}

// Luôn trả về "thành công" ở tầng controller bất kể email có tồn tại trong bảng hay không (giống
// forgotPassword ở auth.service.ts) — không cần thiết phải chống dò ở mức độ nghiêm ngặt như mật khẩu,
// nhưng giữ thói quen nhất quán: không xác nhận/phủ nhận qua response liệu 1 email cụ thể có từng
// đăng ký nhận tin hay không.
export async function unsubscribe(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email: normalized } });
  if (existing?.isActive) {
    await prisma.newsletterSubscriber.update({
      where: { id: existing.id },
      data: { isActive: false, unsubscribedAt: new Date() },
    });
  }
}

// Quản trị (permission `blog.manage`, dùng LẠI cùng nhóm "Nội dung" — xem docs/05 §2.4).
export async function listAdmin({ isActive, page, limit }: ListNewsletterQuery) {
  const where = { ...(isActive !== undefined && { isActive }) };
  const [items, total] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { subscribedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.newsletterSubscriber.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

// Xoá THẬT (khác unsubscribe — chỉ đổi isActive) — dùng cho yêu cầu xoá dữ liệu cá nhân hẳn (vd
// khách yêu cầu quyền "bị lãng quên"), KHÔNG dùng cho unsubscribe thông thường.
export async function remove(actorId: string, id: string, ipAddress?: string): Promise<void> {
  const subscriber = await prisma.newsletterSubscriber.findUnique({ where: { id } });
  if (!subscriber) throw new AppError("Không tìm thấy người đăng ký", 404, "NOT_FOUND");

  await prisma.newsletterSubscriber.delete({ where: { id } });
  await auditLog.record({
    actorId,
    action: "newsletter_subscriber.delete",
    entityType: "newsletter_subscriber",
    entityId: id,
    before: subscriber,
    ...(ipAddress && { ipAddress }),
  });
}
