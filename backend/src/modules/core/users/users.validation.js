const { z } = require('zod');

const updateProfileSchema = z.object({
  fullName: z.string().min(1).optional(),
  avatarFileId: z.string().uuid().nullable().optional(),
  phone: z.string().min(1).nullable().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
});

const sessionIdParamSchema = z.object({
  id: z.string().uuid(),
});

module.exports = { updateProfileSchema, changePasswordSchema, sessionIdParamSchema };
