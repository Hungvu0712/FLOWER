import { Router } from "express";
import * as controller from "./occasions.controller";

// Công khai — storefront cần đọc được mà không cần đăng nhập. Xem occasions.admin.routes.ts cho CRUD.
export const occasionsRouter = Router();
occasionsRouter.get("/", controller.listPublic);
