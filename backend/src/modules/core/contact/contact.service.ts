import { prisma } from "../../../config/prisma";
import { env } from "../../../config/env";
import { AppError } from "../../../shared/errors";
import { escapeHtml } from "../../../shared/utils/escapeHtml";
import { buildPaginationMeta } from "../../../shared/response/ApiResponse";
import { emailService } from "../email/email.service";
import { contactMessageTemplate } from "../email/email.templates";
import * as auditLog from "../audit-log/auditLog.service";
import type {
  CreateContactMessageInput,
  ListContactMessagesQuery,
  UpdateContactMessageInput,
} from "./contact.validation";

// Khách gửi form Liên hệ — KHÔNG cần đăng nhập (xem contact.routes.ts). Lưu vào DB TRƯỚC (nguồn sự
// thật, admin xem lại được dù email lỗi/vào spam), gửi email thông báo là best-effort — lỗi gửi email
// không được làm hỏng trải nghiệm khách (giống hệt cách magicLink/passwordReset đang nuốt lỗi gửi mail
// ở auth.service.ts, xem docs/07 §1).
export async function create(input: CreateContactMessageInput) {
  const email = input.email || null;

  const message = await prisma.contactMessage.create({
    data: { name: input.name, phone: input.phone, email, message: input.message },
  });

  await emailService
    .sendEmail({
      to: env.contactEmail,
      subject: `Liên hệ mới từ ${escapeHtml(input.name)}`,
      html: contactMessageTemplate({
        name: escapeHtml(input.name),
        phone: escapeHtml(input.phone),
        email: email ? escapeHtml(email) : null,
        message: escapeHtml(input.message),
      }),
      type: "contact_message",
    })
    .catch(() => {});

  return message;
}

export async function list({ isHandled, page, limit }: ListContactMessagesQuery) {
  const where = isHandled === undefined ? {} : { isHandled };
  const [items, total] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contactMessage.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function update(
  actorId: string,
  id: string,
  input: UpdateContactMessageInput,
  ipAddress?: string,
) {
  const existing = await prisma.contactMessage.findUnique({ where: { id } });
  if (!existing) throw new AppError("Không tìm thấy tin nhắn", 404, "NOT_FOUND");

  const updated = await prisma.contactMessage.update({
    where: { id },
    data: { isHandled: input.isHandled },
  });

  await auditLog.record({
    actorId,
    action: input.isHandled ? "contact_message.mark_handled" : "contact_message.mark_unhandled",
    entityType: "contact_message",
    entityId: id,
    ...(ipAddress && { ipAddress }),
  });
  return updated;
}
