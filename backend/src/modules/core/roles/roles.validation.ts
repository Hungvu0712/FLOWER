import { z } from "zod";

export const createRoleSchema = z.object({
  code: z.string().regex(/^[a-z][a-z0-9_]*$/, "Code chỉ gồm chữ thường, số, gạch dưới"),
  name: z.string().min(1),
  description: z.string().optional(),
  permissionIds: z.array(z.number().int()).default([]),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  permissionIds: z.array(z.number().int()).optional(),
});
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const roleIdParamSchema = z.object({ id: z.coerce.number().int() });
