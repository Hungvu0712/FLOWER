import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import {
  createFolderSchema,
  updateFolderSchema,
  folderIdParamSchema,
  listFoldersQuerySchema,
} from "./folders.validation";

const TAGS = ["Folders"];
const PERMISSION = "files.manage";

const folderSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  parentId: z.string().uuid().nullable(),
  createdBy: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  _count: z.object({ folders: z.number().int(), files: z.number().int() }),
});

registerRoute({
  method: "get",
  path: "/api/v1/folders",
  tags: TAGS,
  summary: "Danh sách thư mục con của parentId",
  description: "Bỏ trống `parentId` = cấp gốc. Không phân trang — cây tải dần từng cấp (lazy-load).",
  auth: { permission: PERMISSION },
  request: { query: listFoldersQuerySchema },
  response: { schema: z.array(folderSchema) },
});

registerRoute({
  method: "post",
  path: "/api/v1/folders",
  tags: TAGS,
  summary: "Tạo thư mục",
  auth: { permission: PERMISSION },
  request: { body: createFolderSchema },
  response: { status: 201, schema: folderSchema },
  extraStatuses: [404, 400], // 404 PARENT_NOT_FOUND · 400 FOLDER_CYCLE
});

registerRoute({
  method: "patch",
  path: "/api/v1/folders/{id}",
  tags: TAGS,
  summary: "Sửa tên và/hoặc di chuyển (parentId)",
  auth: { permission: PERMISSION },
  request: { params: folderIdParamSchema, body: updateFolderSchema },
  response: { schema: folderSchema },
  extraStatuses: [404, 400],
});

registerRoute({
  method: "delete",
  path: "/api/v1/folders/{id}",
  tags: TAGS,
  summary: "Xoá thư mục",
  description: "Chỉ khi thư mục rỗng — còn thư mục con hoặc file bên trong phải chuyển/xoá trước.",
  auth: { permission: PERMISSION },
  request: { params: folderIdParamSchema },
  response: { schema: z.null() },
  extraStatuses: [404, 409], // 409 FOLDER_NOT_EMPTY
});
