import { registerRoute } from "../../../openapi/components";
import { siteContentKeyParamSchema, updateSiteContentBodySchema } from "./siteContent.validation";
import { siteContentSchema } from "./siteContent.openapi";

const TAGS = ["Admin · Site Content"];
const PERMISSION = "site_content.manage";

registerRoute({
  method: "patch",
  path: "/api/v1/admin/site-content/{key}",
  tags: TAGS,
  summary: "Sửa 1 giá trị nội dung storefront",
  description:
    "`value` được validate lại theo ĐÚNG kiểu của `key` ở tầng service (route dùng chung 1 path cho " +
    "mọi key nên không validate tĩnh được ở đây). Quyền `site_content.manage` cấp cho cả admin lẫn " +
    "super_admin (khác `settings.manage` của /superadmin/settings — chỉ super_admin).",
  auth: { permission: PERMISSION },
  request: { params: siteContentKeyParamSchema, body: updateSiteContentBodySchema },
  response: { schema: siteContentSchema },
});
