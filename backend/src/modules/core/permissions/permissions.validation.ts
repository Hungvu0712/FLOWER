import { z } from 'zod';
import { zBooleanQuery } from '../../../shared/utils/zBooleanQuery';

export const createPermissionSchema = z.object({
  code: z.string().regex(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/, 'Code dạng "group.action", vd products.export'),
  groupName: z.string().min(1),
  description: z.string().optional(),
});
export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;

export const updatePermissionSchema = z.object({
  code: z.string().regex(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/).optional(), // chặn đổi nếu permission.isSystem, xem service
  groupName: z.string().min(1).optional(),
  description: z.string().optional(),
});
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>;

export const listPermissionsQuerySchema = z.object({
  assignable: zBooleanQuery(), // true = loại bỏ permission is_restricted (dùng khi tạo/sửa role)
});
export type ListPermissionsQuery = z.infer<typeof listPermissionsQuerySchema>;

export const permissionIdParamSchema = z.object({ id: z.coerce.number().int() });
