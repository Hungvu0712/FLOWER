import { asyncHandler } from "../../../shared/middleware";
import { ok } from "../../../shared/response/ApiResponse";
import * as service from "./siteContent.service";
import type { SiteContentKey } from "./siteContent.validation";

// Không nhạy cảm (banner/hotline/zalo/địa chỉ/giờ mở cửa đều hiển thị công khai trên storefront) —
// dùng CHUNG hàm list() cho cả route public lẫn trang quản trị đọc giá trị hiện tại, không cần thêm
// 1 route admin GET riêng chỉ để lặp lại đúng dữ liệu này.
export const listPublic = asyncHandler(async (_req, res) => {
  ok(res, await service.list());
});

export const update = asyncHandler(async (req, res) => {
  const updated = await service.update(
    req.user!.id,
    req.params.key as SiteContentKey,
    req.body.value,
    req.ip,
  );
  ok(res, updated);
});
