import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import {
  createAddressSchema,
  updateAddressSchema,
  addressIdParamSchema,
} from "./addresses.validation";

const TAGS = ["Account · Addresses"];

const addressSchema = z.object({
  id: z.string().uuid(),
  recipientName: z.string(),
  recipientPhone: z.string(),
  addressLine: z.string(),
  ward: z.string().nullable(),
  district: z.string().nullable(),
  city: z.string().nullable(),
  isDefault: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

registerRoute({
  method: "get",
  path: "/api/v1/account/addresses",
  tags: TAGS,
  summary: "Sổ địa chỉ của chính mình",
  description:
    "Chỉ cần đăng nhập — không có permission riêng. Sắp xếp: mặc định trước, cũ nhất trước.",
  auth: {},
  response: { schema: z.array(addressSchema) },
});

registerRoute({
  method: "post",
  path: "/api/v1/account/addresses",
  tags: TAGS,
  summary: "Thêm địa chỉ mới",
  description:
    "Địa chỉ ĐẦU TIÊN của user tự động là mặc định dù không truyền `isDefault`. Đặt `isDefault: true` " +
    "sẽ tự bỏ mặc định của địa chỉ khác (chỉ 1 địa chỉ mặc định/user).",
  auth: {},
  request: { body: createAddressSchema },
  response: { status: 201, schema: addressSchema },
});

registerRoute({
  method: "patch",
  path: "/api/v1/account/addresses/{id}",
  tags: TAGS,
  summary: "Sửa địa chỉ",
  auth: {},
  request: { params: addressIdParamSchema, body: updateAddressSchema },
  response: { schema: addressSchema },
  extraStatuses: [404], // địa chỉ không tồn tại HOẶC không thuộc user đang đăng nhập
});

registerRoute({
  method: "delete",
  path: "/api/v1/account/addresses/{id}",
  tags: TAGS,
  summary: "Xoá địa chỉ",
  description: "Không tự đôn địa chỉ khác lên làm mặc định — khách tự chọn lại nếu cần.",
  auth: {},
  request: { params: addressIdParamSchema },
  response: { schema: z.null() },
  extraStatuses: [404],
});
