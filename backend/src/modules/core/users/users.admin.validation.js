const { z } = require('zod');

const idParamSchema = z.object({ id: z.string().uuid() });

const updateRoleSchema = z.object({
  roleCode: z.string().min(1),
});

const listQuerySchema = z.object({
  status: z.enum(['active', 'blocked']).optional(),
  role: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = { idParamSchema, updateRoleSchema, listQuerySchema };
