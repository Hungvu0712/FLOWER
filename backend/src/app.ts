import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { requestId, errorHandler } from "./shared/middleware";
import { AppError } from "./shared/errors";
import { v1Router } from "./routes/v1";

export const app = express();

app.use(requestId);
app.use(helmet());
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser(env.cookieSecret));

// Health check — ngoài versioning, dùng cho load balancer/uptime monitor. Xem docs/03 §5, §8.
app.get("/health", (_req, res) =>
  res.json({ success: true, data: { status: "ok" } }),
);

app.use("/api/v1", v1Router);

app.use((req, _res, next) =>
  next(new AppError("Không tìm thấy endpoint", 404, "NOT_FOUND")),
);

app.use(errorHandler); // luôn đăng ký cuối cùng
