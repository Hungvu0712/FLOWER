import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().min(1).optional(),
  avatarFileId: z.string().uuid().nullable().optional(),
  phone: z.string().min(1).nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const sessionIdParamSchema = z.object({ id: z.string().uuid() });
