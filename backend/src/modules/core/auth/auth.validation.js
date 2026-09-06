const { z } = require('zod');

const password = z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự');

const registerSchema = z.object({
  fullName: z.string().min(1, 'Vui lòng nhập họ tên'),
  email: z.string().email('Email không hợp lệ'),
  password,
});

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

const magicLinkRequestSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

const magicLinkVerifySchema = z.object({
  token: z.string().min(1),
});

const googleLoginSchema = z.object({
  idToken: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: password,
});

module.exports = {
  registerSchema,
  loginSchema,
  magicLinkRequestSchema,
  magicLinkVerifySchema,
  googleLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
