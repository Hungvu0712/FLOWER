const { z } = require('zod');

const createRoleSchema = z.object({
  code: z.string().regex(/^[a-z][a-z0-9_]*$/, 'Code chỉ gồm chữ thường, số, gạch dưới'),
  name: z.string().min(1),
  description: z.string().optional(),
  permissionIds: z.array(z.number().int()).default([]),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  permissionIds: z.array(z.number().int()).optional(),
});

const idParamSchema = z.object({ id: z.coerce.number().int() });

module.exports = { createRoleSchema, updateRoleSchema, idParamSchema };
