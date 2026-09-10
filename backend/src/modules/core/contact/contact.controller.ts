import { asyncHandler } from "../../../shared/middleware";
import { ok, created, paginated } from "../../../shared/response/ApiResponse";
import * as service from "./contact.service";
import type { ListContactMessagesQuery } from "./contact.validation";

export const create = asyncHandler(async (req, res) => {
  const message = await service.create(req.body);
  created(res, message, "Đã gửi liên hệ, chúng tôi sẽ phản hồi sớm nhất");
});

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.list(req.query as unknown as ListContactMessagesQuery);
  paginated(res, items, meta);
});

export const update = asyncHandler(async (req, res) => {
  const message = await service.update(req.user!.id, req.params.id as string, req.body, req.ip);
  ok(res, message);
});
