import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { requestId, errorHandler } from "./shared/middleware";
import { AppError } from "./shared/errors";
import { v1Router } from "./routes/v1";

export const app = express();

// Chỉ tin proxy ở production — dev chạy trực tiếp, không có reverse proxy nào phía trước. Thiếu dòng
// này thì sau Nginx/Caddy/Render, `req.ip` luôn là IP CỦA PROXY cho mọi request: rate limit theo IP
// dùng chung 1 bucket cho toàn bộ người dùng (1 kẻ tấn công gọi đủ số lượt là khoá luôn người dùng
// thật — DoS), và audit_logs.ip_address mất khả năng truy vết ai thao tác từ đâu. Số hop cấu hình qua
// TRUST_PROXY_HOPS — KHÔNG dùng `true` (tin mọi hop), client tự chèn X-Forwarded-For sẽ giả mạo được
// req.ip. Xem docs/12 BE-02.
if (env.isProd) app.set("trust proxy", env.trustProxyHops);

app.use(requestId);
app.use(helmet());
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser(env.cookieSecret));

// Health check — ngoài versioning, dùng cho load balancer/uptime monitor. Xem docs/03 §5, §8.
app.get("/health", (_req, res) => res.json({ success: true, data: { status: "ok" } }));

app.use("/api/v1", v1Router);

app.use((req, _res, next) => next(new AppError("Không tìm thấy endpoint", 404, "NOT_FOUND")));

app.use(errorHandler); // luôn đăng ký cuối cùng
