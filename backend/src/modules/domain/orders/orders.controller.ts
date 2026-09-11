import { asyncHandler } from "../../../shared/middleware";
import { ok, created, paginated } from "../../../shared/response/ApiResponse";
import * as service from "./orders.service";
import type {
  CreateOrderInput,
  ListOrdersQuery,
  ListOwnOrdersQuery,
  UpdateOrderStatusInput,
} from "./orders.validation";

export const create = asyncHandler(async (req, res) => {
  const order = await service.create(req.body as CreateOrderInput, req.user?.id, req.ip);
  created(res, order);
});

export const getById = asyncHandler(async (req, res) => {
  const order = await service.getById(req.params.id as string);
  ok(res, order);
});

export const listOwn = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listOwn(
    req.user!.id,
    req.query as unknown as ListOwnOrdersQuery,
  );
  paginated(res, items, meta);
});

export const listAdmin = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listAdmin(req.query as unknown as ListOrdersQuery);
  paginated(res, items, meta);
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body as UpdateOrderStatusInput;
  const order = await service.updateStatus(
    req.user!.id,
    req.params.id as string,
    status,
    req.user!.permissions,
    req.ip,
  );
  ok(res, order);
});
