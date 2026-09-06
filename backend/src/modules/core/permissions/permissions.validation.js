const { z } = require('zod');

const createPermissionSchema = z.object({
  code: z.string().regex(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/, 'Code dạng "group.action", vd products.export'),
  groupName: z.string().min(1),
  description: z.string().optional(),
});

const updatePermissionSchema = z.object({
  code: z.string().regex(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/).optional(), // chặn đổi nếu permission.isSystem, xem service
  groupName: z.string().min(1).optional(),
  description: z.string().optional(),
});

const listQuerySchema = z.object({
  assignable: z.coerce.boolean().optional(), // true = loại bỏ permission is_restricted (dùng khi tạo/sửa role)
});

const idParamSchema = z.object({ id: z.coerce.number().int() });

module.exports = { createPermissionSchema, updatePermissionSchema, listQuerySchema, idParamSchema };
