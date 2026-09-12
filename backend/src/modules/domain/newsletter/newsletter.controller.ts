import { asyncHandler } from "../../../shared/middleware";
import { ok, paginated } from "../../../shared/response/ApiResponse";
import * as service from "./newsletter.service";
import type {
  ListNewsletterQuery,
  SubscribeNewsletterInput,
  UnsubscribeNewsletterInput,
} from "./newsletter.validation";

export const subscribe = asyncHandler(async (req, res) => {
  await service.subscribe((req.body as SubscribeNewsletterInput).email);
  ok(res, null, "Đã đăng ký nhận tin");
});

export const unsubscribe = asyncHandler(async (req, res) => {
  await service.unsubscribe((req.body as UnsubscribeNewsletterInput).email);
  ok(res, null, "Đã hủy đăng ký nhận tin");
});

export const listAdmin = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listAdmin(req.query as unknown as ListNewsletterQuery);
  paginated(res, items, meta);
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(req.user!.id, req.params.id as string, req.ip);
  ok(res, null, "Đã xoá người đăng ký");
});
