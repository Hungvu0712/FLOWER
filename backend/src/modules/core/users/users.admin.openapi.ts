import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import { userIdParamSchema, updateRoleSchema, listUsersQuerySchema } from "./users.admin.validation";

const TAGS = ["SuperAdmin · Users"];
const PERMISSION = "users.manage";

const userListItemSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.string().email(),
  status: z.enum(["active", "blocked"]),
  createdAt: z.string().datetime(),
  roles: z.array(z.object({ role: z.object({ code: z.string(), name: z.string() }) })),
});

// 400 CANNOT_TARGET_SELF · 403 CANNOT_GRANT_SUPER_ADMIN (chỉ /role) — xem docs/06 §11 "Ràng buộc
// chống leo thang quyền", enforce ở service, không chỉ UI.
const SELF_ESCALATION_STATUSES = [400, 404];

registerRoute({
  method: "get",
  path: "/api/v1/superadmin/users",
  tags: TAGS,
  summary: "Danh sách user (phân trang)",
  description: "Không trả user đã xoá mềm. `search` tìm trong `fullName`/`email`, không phân biệt hoa thường.",
  auth: { permission: PERMISSION },
  request: { query: listUsersQuerySchema },
  response: { schema: userListItemSchema, paginated: true },
});

registerRoute({
  method: "patch",
  path: "/api/v1/superadmin/users/{id}/block",
  tags: TAGS,
  summary: "Khoá tài khoản",
  auth: { permission: PERMISSION },
  request: { params: userIdParamSchema },
  response: { schema: z.null() },
  extraStatuses: SELF_ESCALATION_STATUSES,
});

registerRoute({
  method: "patch",
  path: "/api/v1/superadmin/users/{id}/unblock",
  tags: TAGS,
  summary: "Mở khoá tài khoản",
  auth: { permission: PERMISSION },
  request: { params: userIdParamSchema },
  response: { schema: z.null() },
  extraStatuses: SELF_ESCALATION_STATUSES,
});

registerRoute({
  method: "delete",
  path: "/api/v1/superadmin/users/{id}",
  tags: TAGS,
  summary: "Xoá mềm user",
  description:
    "Đặt `deletedAt`, `status = blocked`, thu hồi toàn bộ session, đổi email thành " +
    "`<email>.deleted.<id>` để giải phóng địa chỉ email cho lần đăng ký sau.",
  auth: { permission: PERMISSION },
  request: { params: userIdParamSchema },
  response: { schema: z.null() },
  extraStatuses: SELF_ESCALATION_STATUSES,
});

registerRoute({
  method: "post",
  path: "/api/v1/superadmin/users/{id}/reset-password",
  tags: TAGS,
  summary: "Sinh mật khẩu mới + gửi email",
  description:
    "Gửi email TRƯỚC rồi mới ghi DB — email lỗi thì mật khẩu cũ còn nguyên. Mật khẩu bản rõ " +
    "KHÔNG log, KHÔNG trả về response. KHÔNG chặn tự reset mật khẩu của chính mình.",
  auth: { permission: PERMISSION },
  request: { params: userIdParamSchema },
  response: { schema: z.null() },
  extraStatuses: [404],
});

registerRoute({
  method: "patch",
  path: "/api/v1/superadmin/users/{id}/role",
  tags: TAGS,
  summary: "Đổi role",
  auth: { permission: PERMISSION },
  request: { params: userIdParamSchema, body: updateRoleSchema },
  response: { schema: z.null() },
  extraStatuses: [...SELF_ESCALATION_STATUSES, 403], // 403 CANNOT_GRANT_SUPER_ADMIN
});
