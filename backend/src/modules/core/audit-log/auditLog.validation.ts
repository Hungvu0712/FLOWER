import { z } from "zod";

export const listAuditLogQuerySchema = z.object({
  actorId: z.string().uuid().optional(),
  entityType: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListAuditLogQuery = z.infer<typeof listAuditLogQuerySchema>;
