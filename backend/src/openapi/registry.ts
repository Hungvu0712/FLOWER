import { OpenAPIRegistry, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// Gọi 1 LẦN DUY NHẤT ở module này, trước khi bất kỳ *.openapi.ts nào import "zod" và gọi `.openapi()`
// trên schema — thêm method `.openapi()` vào MỌI instance ZodType (side effect toàn cục trên chính
// lớp ZodType của thư viện "zod", không phải trên riêng registry này). Import registry.ts trước mọi
// nơi khác dùng `.openapi()` là đủ, nhờ Node cache module: lần import sau chỉ trả lại registry đã có,
// không gọi lại extendZodWithOpenApi. Xem docs/12 BE-12.
extendZodWithOpenApi(z);

// Registry DÙNG CHUNG cho toàn bộ API — mỗi module gọi registry.registerPath(...) trong
// `<module>.openapi.ts` của mình (side effect lúc import, xem generate.ts) để thêm route vào đây.
export const registry = new OpenAPIRegistry();
