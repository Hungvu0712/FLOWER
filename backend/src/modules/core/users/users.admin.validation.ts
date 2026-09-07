import { z } from 'zod';

export const userIdParamSchema = z.object({ id: z.string().uuid() });

export const updateRoleSchema = z.object({
  roleCode: z.string().min(1),
});
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const listUsersQuerySchema = z.object({
  status: z.enum(['active', 'blocked']).optional(),
  role: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
