import { asyncHandler } from '../../../core/middleware';
import { paginated } from '../../../core/response/ApiResponse';
import * as auditLogService from './auditLog.service';
import type { ListAuditLogQuery } from './auditLog.validation';

export const list = asyncHandler(async (req, res) => {
  const query = req.query as unknown as ListAuditLogQuery;
  const { items, meta } = await auditLogService.list(query);
  paginated(res, items, meta);
});
