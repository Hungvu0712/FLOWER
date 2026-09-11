import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import { safeUserSchema } from "../../../openapi/schemas/shared";
import {
  registerSchema,
  loginSchema,
  magicLinkRequestSchema,
  magicLinkVerifySchema,
  googleLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.validation";

const TAGS = ["Auth"];

const sessionResponseSchema = z.object({ user: safeUserSchema });
const loginMethodsResponseSchema = z.array(
  z.object({
    method: z.enum(["google_oauth", "email_password", "magic_link"]),
    isEnabled: z.boolean(),
  }),
);

registerRoute({
  method: "get",
  path: "/api/v1/auth/login-methods",
  tags: TAGS,
  summary: "Phương thức đăng nhập đang bật",
  description: "Frontend dùng để ẩn/hiện nút đăng nhập tương ứng.",
  auth: false,
  response: { schema: loginMethodsResponseSchema },
});

registerRoute({
  method: "post",
  path: "/api/v1/auth/register",
  tags: TAGS,
  summary: "Đăng ký bằng email + mật khẩu",
  description: "KHÔNG tự đăng nhập — người dùng phải gọi `/login` sau khi đăng ký thành công.",
  auth: false,
  request: { body: registerSchema },
  response: { schema: z.object({ user: safeUserSchema }) },
  extraStatuses: [409, 403], // 409 EMAIL_TAKEN · 403 LOGIN_METHOD_DISABLED
});

registerRoute({
  method: "post",
  path: "/api/v1/auth/login",
  tags: TAGS,
  summary: "Đăng nhập email + mật khẩu",
  description:
    "Set-Cookie `access_token` + `refresh_token`. Sai email/mật khẩu trả CÙNG một thông điệp " +
    "(chống dò tài khoản). Rate limit theo IP và theo email (docs/12 BE-16).",
  auth: false,
  request: { body: loginSchema },
  response: { schema: sessionResponseSchema },
  // 401 INVALID_CREDENTIALS · 403 ACCOUNT_BLOCKED/LOGIN_METHOD_DISABLED ·
  // 429 ACCOUNT_TEMPORARILY_LOCKED (docs/12 BE-17 — khoá tạm sau 5 lần sai liên tiếp)
  extraStatuses: [401, 403, 429],
});

registerRoute({
  method: "post",
  path: "/api/v1/auth/magic-link/request",
  tags: TAGS,
  summary: "Gửi liên kết đăng nhập qua email",
  description: "LUÔN trả 200 dù email không tồn tại (chống dò tài khoản). Rate limit 5/15 phút.",
  auth: false,
  request: { body: magicLinkRequestSchema },
  response: { schema: z.null() },
});

registerRoute({
  method: "post",
  path: "/api/v1/auth/magic-link/verify",
  tags: TAGS,
  summary: "Đăng nhập bằng token magic link",
  description:
    "Token dùng 1 lần, TTL mặc định 15 phút. Email chưa có tài khoản → tự tạo (magic link kiêm " +
    "\"đăng ký nhanh\"). Set-Cookie khi thành công.",
  auth: false,
  request: { body: magicLinkVerifySchema },
  response: { schema: sessionResponseSchema },
  extraStatuses: [401], // 401 INVALID_MAGIC_LINK
});

registerRoute({
  method: "post",
  path: "/api/v1/auth/google",
  tags: TAGS,
  summary: "Đăng nhập bằng Google ID token",
  description: "Backend verify `idToken` bằng google-auth-library với audience = GOOGLE_CLIENT_ID.",
  auth: false,
  request: { body: googleLoginSchema },
  response: { schema: sessionResponseSchema },
  extraStatuses: [401, 403], // 401 INVALID_GOOGLE_TOKEN · 403 LOGIN_METHOD_DISABLED
});

registerRoute({
  method: "post",
  path: "/api/v1/auth/refresh",
  tags: TAGS,
  summary: "Cấp cặp token mới (rotation)",
  description:
    "Không có body — đọc cookie `refresh_token`. Thu hồi token cũ, phát hành cặp mới. " +
    "Phát hiện dùng lại token đã thu hồi (docs/12 BE-03) → thu hồi TOÀN BỘ session của user.",
  auth: false,
  response: { schema: sessionResponseSchema },
  extraStatuses: [401], // 401 UNAUTHENTICATED (thiếu cookie) · 401 SESSION_EXPIRED
});

registerRoute({
  method: "post",
  path: "/api/v1/auth/logout",
  tags: TAGS,
  summary: "Đăng xuất",
  description: "Thu hồi session ứng với cookie `refresh_token` hiện tại + xoá cookie.",
  auth: false,
  response: { schema: z.null() },
});

registerRoute({
  method: "post",
  path: "/api/v1/auth/forgot-password",
  tags: TAGS,
  summary: "Gửi email đặt lại mật khẩu",
  description: "LUÔN trả 200 dù email không tồn tại (chống dò tài khoản). Rate limit theo IP và email.",
  auth: false,
  request: { body: forgotPasswordSchema },
  response: { schema: z.null() },
});

registerRoute({
  method: "post",
  path: "/api/v1/auth/reset-password",
  tags: TAGS,
  summary: "Đặt lại mật khẩu bằng token",
  description: "Token dùng 1 lần (nguyên tử — docs/12 BE-05), TTL mặc định 30 phút.",
  auth: false,
  request: { body: resetPasswordSchema },
  response: { schema: z.null() },
  extraStatuses: [401], // 401 INVALID_RESET_TOKEN
});
