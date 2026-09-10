import { z } from 'zod';
import { zBooleanQuery } from '../../../shared/utils/zBooleanQuery';

// Endpoint công khai (không đăng nhập) — giới hạn độ dài chặt hơn bình thường để giảm bề mặt spam/abuse
// (xem contact.routes.ts — còn có rate limit theo IP nữa).
export const createContactMessageSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên').max(100),
  phone: z.string().trim().min(8, 'Số điện thoại không hợp lệ').max(20),
  email: z.string().trim().email('Email không hợp lệ').max(255).optional().or(z.literal('')),
  message: z.string().trim().min(1, 'Vui lòng nhập lời nhắn').max(2000),
});
export type CreateContactMessageInput = z.infer<typeof createContactMessageSchema>;

export const listContactMessagesQuerySchema = z.object({
  isHandled: zBooleanQuery(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});
export type ListContactMessagesQuery = z.infer<typeof listContactMessagesQuerySchema>;

export const contactMessageIdParamSchema = z.object({ id: z.string().uuid() });

export const updateContactMessageSchema = z.object({ isHandled: z.boolean() });
export type UpdateContactMessageInput = z.infer<typeof updateContactMessageSchema>;
