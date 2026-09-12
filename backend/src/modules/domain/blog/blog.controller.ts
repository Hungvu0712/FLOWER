import { asyncHandler } from "../../../shared/middleware";
import { created, ok, paginated } from "../../../shared/response/ApiResponse";
import * as service from "./blog.service";
import type {
  CreateBlogPostInput,
  ListAdminBlogPostsQuery,
  ListBlogPostsQuery,
  UpdateBlogPostInput,
} from "./blog.validation";

export const listPublic = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listPublic(req.query as unknown as ListBlogPostsQuery);
  paginated(res, items, meta);
});

export const getPublicBySlug = asyncHandler(async (req, res) => {
  const post = await service.getPublicBySlug(req.params.slug as string);
  ok(res, post);
});

export const listAdmin = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listAdmin(req.query as unknown as ListAdminBlogPostsQuery);
  paginated(res, items, meta);
});

export const create = asyncHandler(async (req, res) => {
  const post = await service.create(req.user!.id, req.body as CreateBlogPostInput, req.ip);
  created(res, post);
});

export const update = asyncHandler(async (req, res) => {
  const post = await service.update(
    req.user!.id,
    req.params.id as string,
    req.body as UpdateBlogPostInput,
    req.ip,
  );
  ok(res, post);
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(req.user!.id, req.params.id as string, req.ip);
  ok(res, null, "Đã xoá bài viết");
});
