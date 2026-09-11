import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import { permissionSchema } from "../../../openapi/schemas/shared";
import { createRoleSchema, updateRoleSchema, roleIdParamSchema } from "./roles.validation";

const TAGS = ["SuperAdmin · Roles"];
const PERMISSION = "roles.manage";

const roleSchema = z.object({
  id: z.number().int(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isSystem: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  permissions: z.array(z.object({ permission: permissionSchema })),
  _count: z.object({ users: z.number().int() }),
});

registerRoute({
  method: "get",
  path: "/api/v1/superadmin/roles",
  tags: TAGS,
  summary: "Danh sách role + permission + số user đang gán",
  auth: { permission: PERMISSION },
  response: { schema: z.array(roleSchema) },
});

registerRoute({
  method: "post",
  path: "/api/v1/superadmin/roles",
  tags: TAGS,
  summary: "Tạo Custom Role",
  description:
    "`isSystem = false`. Permission `isRestricted = true` (vd `users.manage`, `roles.manage`) " +
    "LUÔN bị lọc bỏ khỏi `permissionIds` ở tầng service — chốt chặn \"shadow super_admin\".",
  auth: { permission: PERMISSION },
  request: { body: createRoleSchema },
  response: { status: 201, schema: roleSchema },
});

registerRoute({
  method: "patch",
  path: "/api/v1/superadmin/roles/{id}",
  tags: TAGS,
  summary: "Sửa tên/mô tả/permission",
  auth: { permission: PERMISSION },
  request: { params: roleIdParamSchema, body: updateRoleSchema },
  response: { schema: roleSchema },
  extraStatuses: [403, 404], // 403 SYSTEM_ROLE_LOCKED
});

registerRoute({
  method: "delete",
  path: "/api/v1/superadmin/roles/{id}",
  tags: TAGS,
  summary: "Xoá Custom Role",
  auth: { permission: PERMISSION },
  request: { params: roleIdParamSchema },
  response: { schema: z.null() },
  extraStatuses: [403, 404, 409], // 403 SYSTEM_ROLE_LOCKED · 409 ROLE_IN_USE
});
