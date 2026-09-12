import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import {
  createSpecialDateSchema,
  updateSpecialDateSchema,
  specialDateIdParamSchema,
} from "./specialDates.validation";

const TAGS = ["Account · Special Dates"];

const specialDateSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  date: z.string().datetime(),
  remindDaysBefore: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

registerRoute({
  method: "get",
  path: "/api/v1/account/special-dates",
  tags: TAGS,
  summary: "Danh sách ngày đặc biệt (sinh nhật/kỷ niệm) của chính mình",
  description:
    "Chỉ cần đăng nhập — không có permission riêng. Chỉ THÁNG-NGÀY của `date` có ý nghĩa (lặp lại " +
    "hằng năm), năm không mang ý nghĩa gì.",
  auth: {},
  response: { schema: z.array(specialDateSchema) },
});

registerRoute({
  method: "post",
  path: "/api/v1/account/special-dates",
  tags: TAGS,
  summary: "Thêm ngày đặc biệt mới",
  description: "Bỏ trống `remindDaysBefore` → mặc định nhắc trước 3 ngày.",
  auth: {},
  request: { body: createSpecialDateSchema },
  response: { status: 201, schema: specialDateSchema },
});

registerRoute({
  method: "patch",
  path: "/api/v1/account/special-dates/{id}",
  tags: TAGS,
  summary: "Sửa ngày đặc biệt",
  description:
    "Đổi `date`/`remindDaysBefore` sẽ reset trạng thái đã-nhắc-năm-nay (xem module doc).",
  auth: {},
  request: { params: specialDateIdParamSchema, body: updateSpecialDateSchema },
  response: { schema: specialDateSchema },
  extraStatuses: [404],
});

registerRoute({
  method: "delete",
  path: "/api/v1/account/special-dates/{id}",
  tags: TAGS,
  summary: "Xoá ngày đặc biệt",
  auth: {},
  request: { params: specialDateIdParamSchema },
  response: { schema: z.null() },
  extraStatuses: [404],
});
