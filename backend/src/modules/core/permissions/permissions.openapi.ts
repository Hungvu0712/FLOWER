import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import { permissionSchema } from "../../../openapi/schemas/shared";
import {
  createPermissionSchema,
  updatePermissionSchema,
  listPermissionsQuerySchema,
  permissionIdParamSchema,
} from "./permissions.validation";

const TAGS = ["SuperAdmin · Permissions"];
const PERMISSION = "permissions.manage";

registerRoute({
  method: "get",
  path: "/api/v1/superadmin/permissions",
  tags: TAGS,
  summary: "Danh sách permission",
  description: "`assignable=true` loại bỏ permission `isRestricted` — dùng khi tạo/sửa role.",
  auth: { permission: PERMISSION },
  request: { query: listPermissionsQuerySchema },
  response: { schema: z.array(permissionSchema) },
});

registerRoute({
  method: "post",
  path: "/api/v1/superadmin/permissions",
  tags: TAGS,
  summary: "Tạo permission mới",
  description:
    "`isSystem = false`. Permission tạo qua UI chưa chặn được gì cho tới khi có `authorize('code-đó')` " +
    "trong code — đây là bản chất permission thực thi trong code, không sửa được bằng UI.",
  auth: { permission: PERMISSION },
  request: { body: createPermissionSchema },
  response: { status: 201, schema: permissionSchema },
  extraStatuses: [409], // 409 PERMISSION_CODE_TAKEN
});

registerRoute({
  method: "patch",
  path: "/api/v1/superadmin/permissions/{id}",
  tags: TAGS,
  summary: "Sửa code/groupName/description",
  auth: { permission: PERMISSION },
  request: { params: permissionIdParamSchema, body: updatePermissionSchema },
  response: { schema: permissionSchema },
  extraStatuses: [403, 404, 409], // 403 SYSTEM_PERMISSION_LOCKED (đổi code) · 409 trùng code
});

registerRoute({
  method: "delete",
  path: "/api/v1/superadmin/permissions/{id}",
  tags: TAGS,
  summary: "Xoá permission",
  auth: { permission: PERMISSION },
  request: { params: permissionIdParamSchema },
  response: { schema: z.null() },
  extraStatuses: [403, 404, 409], // 403 SYSTEM_PERMISSION_LOCKED · 409 PERMISSION_IN_USE
});
