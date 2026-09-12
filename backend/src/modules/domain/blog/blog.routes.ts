import { Router } from "express";
import { validate } from "../../../shared/middleware";
import * as controller from "./blog.controller";
import { blogPostSlugParamSchema, listBlogPostsQuerySchema } from "./blog.validation";

// Công khai — storefront đọc bài viết ĐÃ XUẤT BẢN. Xem blog.admin.routes.ts cho CRUD (kể cả draft).
export const blogRouter = Router();
blogRouter.get("/", validate({ query: listBlogPostsQuerySchema }), controller.listPublic);
blogRouter.get("/:slug", validate({ params: blogPostSlugParamSchema }), controller.getPublicBySlug);
