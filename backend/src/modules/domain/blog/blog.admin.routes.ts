import { Router } from "express";
import { authorize, validate } from "../../../shared/middleware";
import * as controller from "./blog.controller";
import {
  blogPostIdParamSchema,
  createBlogPostSchema,
  listAdminBlogPostsQuerySchema,
  updateBlogPostSchema,
} from "./blog.validation";

// Mount với `authenticate` ở routes/v1/index.ts (prefix /api/v1/admin/blog) — yêu cầu permission
// `blog.manage` (đã seed sẵn từ đầu dự án, chỉ admin/super_admin — xem docs/05 §2.4).
export const blogAdminRouter = Router();
blogAdminRouter.use(authorize("blog.manage"));

blogAdminRouter.get("/", validate({ query: listAdminBlogPostsQuerySchema }), controller.listAdmin);
blogAdminRouter.post("/", validate({ body: createBlogPostSchema }), controller.create);
blogAdminRouter.patch(
  "/:id",
  validate({ params: blogPostIdParamSchema, body: updateBlogPostSchema }),
  controller.update,
);
blogAdminRouter.delete("/:id", validate({ params: blogPostIdParamSchema }), controller.remove);
