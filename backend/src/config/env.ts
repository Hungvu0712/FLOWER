import "dotenv/config";

// Validate env lúc khởi động — thiếu biến bắt buộc thì fail fast với lỗi rõ ràng thay vì lỗi mập mờ
// lúc runtime giữa chừng request. Xem docs/09 · docs/03 §7.
function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT || 4000),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",

  databaseUrl: required("DATABASE_URL"),

  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET"),
    refreshSecret: required("JWT_REFRESH_SECRET"), // dự phòng nếu sau này đổi refresh token sang JWT
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "5m",
    refreshExpiresInDays: 30,
  },

  cookieSecret: process.env.COOKIE_SECRET || "dev-only-secret",

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },

  email: {
    provider: (process.env.EMAIL_PROVIDER || "smtp") as "resend" | "smtp",
    from: process.env.EMAIL_FROM || "no-reply@example.com",
    resendApiKey: process.env.RESEND_API_KEY || "",
    smtp: {
      host: process.env.SMTP_HOST || "",
      port: Number(process.env.SMTP_PORT || 587),
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
  },

  magicLink: {
    ttlMinutes: Number(process.env.MAGIC_LINK_TTL_MINUTES || 15),
    baseUrl:
      process.env.MAGIC_LINK_BASE_URL ||
      "http://localhost:3000/magic-link/verify",
  },

  passwordReset: {
    ttlMinutes: Number(process.env.PASSWORD_RESET_TTL_MINUTES || 30),
  },

  // Hộp thư nhận thông báo khi khách gửi form Liên hệ (khác EMAIL_FROM — đó là địa chỉ NGƯỜI GỬI, còn
  // đây là địa chỉ NHẬN thông báo cho chủ shop). Mặc định dùng lại EMAIL_FROM cho môi trường dev khi
  // chưa cấu hình riêng.
  contactEmail: process.env.CONTACT_EMAIL || process.env.EMAIL_FROM || "no-reply@example.com",
} as const;
