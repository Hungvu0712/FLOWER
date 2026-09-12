import { asyncHandler } from "../../../shared/middleware";
import { ok, created, paginated } from "../../../shared/response/ApiResponse";
import * as service from "./reviews.service";
import type {
  CreateReviewInput,
  ListAdminReviewsQuery,
  ListOwnReviewsQuery,
  ListReviewsQuery,
  ModerateReviewInput,
} from "./reviews.validation";

export const listPublic = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listPublic(req.query as unknown as ListReviewsQuery);
  paginated(res, items, meta);
});

export const create = asyncHandler(async (req, res) => {
  const review = await service.create(req.user!.id, req.body as CreateReviewInput);
  created(res, review);
});

export const listOwn = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listOwn(
    req.user!.id,
    req.query as unknown as ListOwnReviewsQuery,
  );
  paginated(res, items, meta);
});

export const listAdmin = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listAdmin(req.query as unknown as ListAdminReviewsQuery);
  paginated(res, items, meta);
});

export const moderate = asyncHandler(async (req, res) => {
  const { isApproved } = req.body as ModerateReviewInput;
  const review = await service.moderate(req.user!.id, req.params.id as string, isApproved);
  ok(res, review);
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(req.user!.id, req.params.id as string);
  ok(res, null, "Đã xoá đánh giá");
});
