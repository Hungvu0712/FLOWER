import { asyncHandler } from "../../../shared/middleware";
import { created, ok, paginated } from "../../../shared/response/ApiResponse";
import * as service from "./coupons.service";
import type {
  CreateCouponInput,
  ListCouponsQuery,
  UpdateCouponInput,
  ValidateCouponInput,
} from "./coupons.validation";

export const validate = asyncHandler(async (req, res) => {
  const result = await service.validate(req.body as ValidateCouponInput);
  ok(res, result);
});

export const listAdmin = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listAdmin(req.query as unknown as ListCouponsQuery);
  paginated(res, items, meta);
});

export const getById = asyncHandler(async (req, res) => {
  const coupon = await service.getById(req.params.id as string);
  ok(res, coupon);
});

export const create = asyncHandler(async (req, res) => {
  const coupon = await service.create(req.user!.id, req.body as CreateCouponInput, req.ip);
  created(res, coupon);
});

export const update = asyncHandler(async (req, res) => {
  const coupon = await service.update(
    req.user!.id,
    req.params.id as string,
    req.body as UpdateCouponInput,
    req.ip,
  );
  ok(res, coupon);
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(req.user!.id, req.params.id as string, req.ip);
  ok(res, null, "Đã xoá mã giảm giá");
});
