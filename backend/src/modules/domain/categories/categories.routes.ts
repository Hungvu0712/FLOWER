import { Router } from "express";
import * as controller from "./categories.controller";

// Công khai — storefront cần đọc được mà không cần đăng nhập. Xem categories.admin.routes.ts cho CRUD.
export const categoriesRouter = Router();
categoriesRouter.get("/", controller.listPublic);
