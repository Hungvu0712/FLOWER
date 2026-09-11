import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import { listAuditLogQuerySchema } from "./auditLog.validation";

const TAGS = ["SuperAdmin · Audit Logs"];

const auditLogEntrySchema = z.object({
  id: z.string().uuid(),
  action: z.string().openapi({ example: "user.block" }),
  entityType: z.string().openapi({ example: "user" }),
  entityId: z.string().openapi({ example: "uuid — role/permission dùng id số, ép về chuỗi" }),
  before: z.unknown().nullable(),
  after: z.unknown().nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.string().datetime(),
  actor: z.object({ id: z.string().uuid(), fullName: z.string(), email: z.string().email() }).nullable(),
});

registerRoute({
  method: "get",
  path: "/api/v1/superadmin/audit-logs",
  tags: TAGS,
  summary: "Nhật ký thao tác nhạy cảm (phân trang)",
  description:
    "`from`/`to` theo ISO 8601. Danh sách `action` đang ghi: docs/modules/core-audit-log.md §3.",
  auth: { permission: "audit.view" },
  request: { query: listAuditLogQuerySchema },
  response: { schema: auditLogEntrySchema, paginated: true },
});
