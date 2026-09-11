import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import { methodParamSchema, updateBodySchema } from "./loginMethods.validation";

const TAGS = ["SuperAdmin · Login Methods"];
const PERMISSION = "settings.manage";

const loginMethodSchema = z.object({
  method: z.enum(["google_oauth", "email_password", "magic_link"]),
  isEnabled: z.boolean(),
  updatedAt: z.string().datetime(),
});

registerRoute({
  method: "get",
  path: "/api/v1/superadmin/login-methods",
  tags: TAGS,
  summary: "Trạng thái 3 phương thức đăng nhập",
  auth: { permission: PERMISSION },
  response: { schema: z.array(loginMethodSchema) },
});

registerRoute({
  method: "patch",
  path: "/api/v1/superadmin/login-methods/{method}",
  tags: TAGS,
  summary: "Bật/tắt một phương thức",
  description:
    "Luôn phải còn ≥ 1 phương thức bật sau khi áp thay đổi — chặn ở service. Vi phạm → " +
    "`400 AT_LEAST_ONE_LOGIN_METHOD_REQUIRED`.",
  auth: { permission: PERMISSION },
  request: { params: methodParamSchema, body: updateBodySchema },
  response: { schema: loginMethodSchema },
  extraStatuses: [400],
});
