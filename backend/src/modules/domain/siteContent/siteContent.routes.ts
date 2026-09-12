import { Router } from "express";
import * as controller from "./siteContent.controller";

// Công khai — storefront đọc banner Hero/hotline/Zalo/địa chỉ/giờ mở cửa (Nav, Hero, Footer, trang
// Liên hệ...). Sửa nằm ở siteContent.admin.routes.ts (cần authenticate + site_content.manage).
export const siteContentRouter = Router();

siteContentRouter.get("/", controller.listPublic);
