import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { generateOpenApiDocument } from "./generate";

// Ngoài versioning — giống /health (app.ts) — vì đây là hạ tầng mô tả API, không phải bản thân API;
// mọi path bên trong document đã tự ghi rõ "/api/v1/..." nên không mập mờ. Sinh lại document mỗi lần
// gọi /openapi.json (rẻ, xem generate.ts) thay vì cache — luôn phản ánh code đang chạy, kể cả sau
// hot-reload lúc dev.
export const openApiRouter = Router();

openApiRouter.get("/openapi.json", (_req, res) => {
  res.json(generateOpenApiDocument());
});

openApiRouter.use("/docs", swaggerUi.serve, swaggerUi.setup(undefined, { swaggerUrl: "/openapi.json" }));
