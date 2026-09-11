import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import { settingKeyParamSchema, updateSettingBodySchema } from "./systemSettings.validation";

const TAGS = ["SuperAdmin · System Settings"];
const PERMISSION = "settings.manage";

const settingSchema = z.object({
  key: z.enum(["site_name", "site_logo", "timezone", "registration_enabled"]),
  value: z.unknown().openapi({
    description:
      "Kiểu THẬT tuỳ key. site_name/timezone: string. registration_enabled: boolean. " +
      "site_logo: KHÁC NHAU giữa đọc và ghi — PATCH nhận uuid|null (id file, xem POST /files), " +
      "GET/response trả { fileId, url } | null (đã join thêm url để hiển thị, xem systemSettings.service.ts).",
  }),
  updatedAt: z.string().datetime(),
});

registerRoute({
  method: "get",
  path: "/api/v1/superadmin/settings",
  tags: TAGS,
  summary: "Danh sách cấu hình hệ thống (key-value)",
  auth: { permission: PERMISSION },
  response: { schema: z.array(settingSchema) },
});

registerRoute({
  method: "patch",
  path: "/api/v1/superadmin/settings/{key}",
  tags: TAGS,
  summary: "Sửa 1 giá trị cấu hình",
  description:
    "`value` được validate lại theo ĐÚNG kiểu của `key` ở tầng service (route dùng chung 1 path cho " +
    "mọi key nên không validate tĩnh được ở đây).",
  auth: { permission: PERMISSION },
  request: { params: settingKeyParamSchema, body: updateSettingBodySchema },
  response: { schema: settingSchema },
});
