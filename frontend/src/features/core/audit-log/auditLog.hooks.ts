'use client';

import { useQuery } from '@tanstack/react-query';
import { auditLogService, type AuditLogQuery } from './auditLog.service';

export function useAuditLogs(params: AuditLogQuery) {
  return useQuery({
    queryKey: ['superadmin', 'audit-logs', params],
    queryFn: () => auditLogService.list(params),
  });
}
