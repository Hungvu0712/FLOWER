import { Router } from 'express';
import { authorize, validate } from '../../../core/middleware';
import * as controller from './auditLog.controller';
import { listAuditLogQuerySchema } from './auditLog.validation';

export const auditLogRouter = Router();

// Mount với `authenticate` ở app.ts (prefix /api/v1/superadmin/audit-logs) — ở đây chỉ cần thêm permission.
auditLogRouter.get('/', authorize('audit.view'), validate({ query: listAuditLogQuerySchema }), controller.list);
