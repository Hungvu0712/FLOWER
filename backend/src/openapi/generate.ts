import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry";

// Side-effect import — mỗi file chỉ gọi registerRoute() ở top-level, không export gì được dùng tới,
// nên phải liệt kê tường minh ở đây để TypeScript/bundler không "tree-shake" mất (registry rỗng nếu
// thiếu 1 dòng). Thêm module mới → thêm 1 dòng import ở đây, xem docs/03 §10 checklist.
import "../modules/core/auth/auth.openapi";
import "../modules/core/users/users.openapi";
import "../modules/core/users/users.admin.openapi";
import "../modules/core/roles/roles.openapi";
import "../modules/core/permissions/permissions.openapi";
import "../modules/core/settings/loginMethods.openapi";
import "../modules/core/settings/systemSettings.openapi";
import "../modules/core/files/files.openapi";
import "../modules/core/files/folders.openapi";
import "../modules/core/audit-log/auditLog.openapi";
import "../modules/core/contact/contact.openapi";
import "../modules/core/contact/contact.admin.openapi";
import "../modules/domain/categories/categories.openapi";
import "../modules/domain/categories/categories.admin.openapi";
import "../modules/domain/products/products.openapi";
import "../modules/domain/products/products.admin.openapi";
import "../modules/domain/orders/orders.openapi";
import "../modules/domain/orders/orders.admin.openapi";

// Sinh lại document MỖI LẦN GỌI (không cache module-level) — rẻ (chạy < 100ms, đo lúc viết), và tránh
// giữ 1 bản cũ trong bộ nhớ tiến trình chạy lâu dài; route mount ở app.ts tự cache theo response HTTP
// nếu cần sau này.
export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Hoa Xinh API",
      version: "1.0.0",
      description:
        "Sinh tự động từ các zod schema thật trong `backend/src/modules/**/*.validation.ts` " +
        "(docs/12 BE-12) — phần request (body/query/params) không thể lệch code vì dùng LẠI CHÍNH " +
        "schema mà `validate()` middleware dùng để chặn request sai lúc chạy thật. Phần response là " +
        "mô tả viết tay dựa trên `prisma/schema.prisma` + `*.service.ts` (có thể lệch nếu code đổi mà " +
        "quên cập nhật `*.openapi.ts` tương ứng — xem docs/03 §10 checklist khi thêm/sửa endpoint).",
    },
    servers: [{ url: "http://localhost:4000", description: "Development" }],
  });
}
