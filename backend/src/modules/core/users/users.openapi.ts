import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import { fileSchema, safeUserSchema } from "../../../openapi/schemas/shared";
import { updateProfileSchema, changePasswordSchema, sessionIdParamSchema } from "./users.validation";

const TAGS = ["Account"];

// getMe() (users.service.ts) include avatarFile + trả thêm roles/permissions HIỆN TẠI từ DB — khác
// SafeUser trần của auth.service.ts (login/register không include quan hệ này).
const meResponseSchema = safeUserSchema.extend({
  avatarFile: fileSchema.nullable(),
  roles: z.array(z.string()).openapi({ example: ["member"] }),
  permissions: z.array(z.string()).openapi({ example: ["orders.view_own"] }),
});

const sessionSchema = z.object({
  id: z.string().uuid(),
  deviceName: z.string().nullable(),
  ipAddress: z.string().nullable(),
  lastActiveAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  isCurrent: z.boolean(),
});

registerRoute({
  method: "get",
  path: "/api/v1/account/me",
  tags: TAGS,
  summary: "Hồ sơ của chính mình",
  description: "`passwordHash` không bao giờ xuất hiện trong response.",
  auth: {},
  response: { schema: meResponseSchema },
});

registerRoute({
  method: "patch",
  path: "/api/v1/account/profile",
  tags: TAGS,
  summary: "Sửa hồ sơ",
  description: "Mọi trường đều tuỳ chọn. Đặt `avatarFileId` ghi thêm `file_usages`.",
  auth: {},
  request: { body: updateProfileSchema },
  response: { schema: meResponseSchema },
});

registerRoute({
  method: "post",
  path: "/api/v1/account/change-password",
  tags: TAGS,
  summary: "Đổi mật khẩu",
  description:
    "Tài khoản chưa từng có mật khẩu (chỉ đăng nhập Google/magic link) được đặt mật khẩu mới mà " +
    "không cần `currentPassword` khớp.",
  auth: {},
  request: { body: changePasswordSchema },
  response: { schema: z.null() },
  extraStatuses: [401], // 401 INVALID_CURRENT_PASSWORD
});

registerRoute({
  method: "get",
  path: "/api/v1/account/sessions",
  tags: TAGS,
  summary: "Danh sách thiết bị đang đăng nhập",
  auth: {},
  response: { schema: z.array(sessionSchema) },
});

registerRoute({
  method: "delete",
  path: "/api/v1/account/sessions/{id}",
  tags: TAGS,
  summary: "Đăng xuất một thiết bị",
  auth: {},
  request: { params: sessionIdParamSchema },
  response: { schema: z.null() },
  extraStatuses: [404],
});

registerRoute({
  method: "delete",
  path: "/api/v1/account/sessions",
  tags: TAGS,
  summary: "Đăng xuất tất cả thiết bị khác",
  description: "Giữ nguyên phiên hiện tại (xác định qua cookie `refresh_token` đang gửi lên).",
  auth: {},
  response: { schema: z.null() },
});
