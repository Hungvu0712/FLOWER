import { z } from 'zod';

// Định nghĩa 1 lần, dùng lại cho cả react-hook-form (validate từng field ở client) lẫn tham chiếu
// khi review payload gửi lên — khớp với schema zod phía backend (auth.validation.js) để tránh lệch rule.
// Xem ARCHITECTURE.md §7.2.
export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z.string().min(1, 'Vui lòng nhập họ tên'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const magicLinkRequestSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});
export type MagicLinkRequestInput = z.infer<typeof magicLinkRequestSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
