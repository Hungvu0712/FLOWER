import { z } from 'zod';

const password = z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự');

export const registerSchema = z.object({
  fullName: z.string().min(1, 'Vui lòng nhập họ tên'),
  email: z.string().email('Email không hợp lệ'),
  password,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const magicLinkRequestSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});
export type MagicLinkRequestInput = z.infer<typeof magicLinkRequestSchema>;

export const magicLinkVerifySchema = z.object({
  token: z.string().min(1),
});
export type MagicLinkVerifyInput = z.infer<typeof magicLinkVerifySchema>;

export const googleLoginSchema = z.object({
  idToken: z.string().min(1),
});
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: password,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
