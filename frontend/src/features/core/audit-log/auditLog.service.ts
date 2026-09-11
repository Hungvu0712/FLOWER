import { api } from '@/lib/axios';

export type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  createdAt: string;
  actor: { id: string; fullName: string; email: string } | null;
};

type PaginatedMeta = { page: number; limit: number; total: number; totalPages: number };

export type AuditLogQuery = {
  entityType?: string;
  from?: string;
  to?: string;
  page?: number;
};

export const auditLogService = {
  list: (params: AuditLogQuery) =>
    api
      .get<{ data: AuditLogEntry[]; meta: PaginatedMeta }>('/api/v1/superadmin/audit-logs', {
        params,
      })
      .then((r) => ({ items: r.data.data, meta: r.data.meta })),
};
