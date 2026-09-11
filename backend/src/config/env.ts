import "dotenv/config";
import { z } from "zod";

// Validate env lúc khởi động — thiếu biến bắt buộc hoặc SAI GIÁ TRỊ (vd JWT secret 1 ký tự) đều
// fail-fast với lỗi rõ ràng ngay lúc khởi động, thay vì lỗi mập mờ lúc runtime giữa chừng request.
// Trước đây (docs/12 BE-11) chỉ kiểm tra biến CÓ MẶT (`process.env[name] ?? fallback`), không kiểm
// tra giá trị — `JWT_ACCESS_SECRET=x` vẫn khởi động bình thường dù là secret vô nghĩa. Xem docs/09.
const rawEnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url("FRONTEND_URL phải là URL hợp lệ").default("http://localhost:3000"),
  // Số hop reverse proxy đứng trước app ở production — xem docs/12 BE-02. Không âm: 0 nghĩa là
  // không có proxy nào (tin thẳng req.ip từ socket), không dùng số âm.
  TRUST_PROXY_HOPS: z.coerce.number().int().nonnegative().default(1),

  DATABASE_URL: z.string().url("DATABASE_URL phải là connection string hợp lệ (postgresql://...)"),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET phải ≥ 32 ký tự"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET phải ≥ 32 ký tự"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("5m"),
  // docs/12 BE-15: trước đây biến này CÓ trong .env.example nhưng code hard-code refreshExpiresInDays:
  // 30, đổi giá trị ở .env KHÔNG có tác dụng gì — đúng loại lệch giữa tài liệu và code mà CLAUDE.md
  // §3 cảnh báo. Định dạng "<số>d" (khớp `JWT_REFRESH_EXPIRES_IN=30d` đã ghi ở .env.example).
  JWT_REFRESH_EXPIRES_IN: z
    .string()
    .regex(/^\d+d$/, "JWT_REFRESH_EXPIRES_IN phải có dạng '<số>d', ví dụ '30d'")
    .default("30d"),
  COOKIE_SECRET: z.string().default("dev-only-secret"),

  GOOGLE_CLIENT_ID: z.string().default(""),

  CLOUDINARY_CLOUD_NAME: z.string().default(""),
  CLOUDINARY_API_KEY: z.string().default(""),
  CLOUDINARY_API_SECRET: z.string().default(""),

  EMAIL_PROVIDER: z.enum(["resend", "smtp"]).default("smtp"),
  // Không dùng .email(): giá trị thật thường có dạng "Tên hiển thị <email@domain>" (RFC 5322), không
  // phải một địa chỉ email trần — z.string().email() sẽ từ chối nhầm định dạng hợp lệ này.
  EMAIL_FROM: z.string().default("no-reply@example.com"),
  RESEND_API_KEY: z.string().default(""),
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),

  MAGIC_LINK_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  MAGIC_LINK_BASE_URL: z.string().url().default("http://localhost:3000/magic-link/verify"),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),

  CONTACT_EMAIL: z.string().optional(),

  // docs/12 OPS-02: mã hoá backup database trước khi upload — bucket Cloudinary bị lộ thì dữ liệu
  // khách hàng (tên, SĐT, địa chỉ giao hàng) không đọc được, tránh vi phạm Nghị định 13/2023/NĐ-CP.
  // Base64 của khoá CÔNG KHAI (PEM, RSA) — base64 để tránh phải escape newline trong file .env.
  // Khoá RIÊNG không nằm trong schema này — KHÔNG BAO GIỜ được đưa lên máy chủ, xem docs/09.
  BACKUP_ENCRYPTION_PUBLIC_KEY: z.string().optional(),
});

const parsed = rawEnvSchema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues.map(
    (issue) => `  - ${issue.path.join(".")}: ${issue.message}`,
  );
  throw new Error(`Cấu hình biến môi trường không hợp lệ:\n${details.join("\n")}`);
}
const raw = parsed.data;

const isProd = raw.NODE_ENV === "production";

// Kiểm tra bổ sung CHỈ ở production — dev/test được phép dùng giá trị mặc định yếu để tiện chạy
// local, nhưng production dùng nguyên giá trị mặc định (secret không ai đổi, cookie secret mẫu) hay
// 2 secret JWT trùng nhau thì coi như không có bảo vệ thật. Xem docs/12 BE-11.
if (isProd) {
  const prodErrors: string[] = [];
  if (raw.COOKIE_SECRET === "dev-only-secret") {
    prodErrors.push(
      "COOKIE_SECRET vẫn là giá trị mặc định 'dev-only-secret' — bắt buộc đổi ở production.",
    );
  }
  if (raw.JWT_ACCESS_SECRET === raw.JWT_REFRESH_SECRET) {
    prodErrors.push(
      "JWT_ACCESS_SECRET và JWT_REFRESH_SECRET đang trùng nhau — phải là 2 giá trị khác nhau.",
    );
  }
  if (prodErrors.length > 0) {
    throw new Error(
      `Cấu hình không an toàn cho production:\n${prodErrors.map((e) => `  - ${e}`).join("\n")}`,
    );
  }
}

export const env = {
  nodeEnv: raw.NODE_ENV,
  isProd,
  port: raw.PORT,
  frontendUrl: raw.FRONTEND_URL,
  trustProxyHops: raw.TRUST_PROXY_HOPS,

  databaseUrl: raw.DATABASE_URL,

  jwt: {
    accessSecret: raw.JWT_ACCESS_SECRET,
    refreshSecret: raw.JWT_REFRESH_SECRET, // dự phòng nếu sau này đổi refresh token sang JWT
    accessExpiresIn: raw.JWT_ACCESS_EXPIRES_IN,
    // parseInt an toàn ở đây — schema đã validate đúng dạng "<số>d" bằng regex phía trên.
    refreshExpiresInDays: parseInt(raw.JWT_REFRESH_EXPIRES_IN, 10),
  },

  cookieSecret: raw.COOKIE_SECRET,

  google: {
    clientId: raw.GOOGLE_CLIENT_ID,
  },

  cloudinary: {
    cloudName: raw.CLOUDINARY_CLOUD_NAME,
    apiKey: raw.CLOUDINARY_API_KEY,
    apiSecret: raw.CLOUDINARY_API_SECRET,
  },

  email: {
    provider: raw.EMAIL_PROVIDER,
    from: raw.EMAIL_FROM,
    resendApiKey: raw.RESEND_API_KEY,
    smtp: {
      host: raw.SMTP_HOST,
      port: raw.SMTP_PORT,
      user: raw.SMTP_USER,
      pass: raw.SMTP_PASS,
    },
  },

  magicLink: {
    ttlMinutes: raw.MAGIC_LINK_TTL_MINUTES,
    baseUrl: raw.MAGIC_LINK_BASE_URL,
  },

  passwordReset: {
    ttlMinutes: raw.PASSWORD_RESET_TTL_MINUTES,
  },

  // Hộp thư nhận thông báo khi khách gửi form Liên hệ (khác EMAIL_FROM — đó là địa chỉ NGƯỜI GỬI, còn
  // đây là địa chỉ NHẬN thông báo cho chủ shop). Mặc định dùng lại EMAIL_FROM cho môi trường dev khi
  // chưa cấu hình riêng.
  contactEmail: raw.CONTACT_EMAIL || raw.EMAIL_FROM,

  // undefined khi chưa cấu hình — backupDatabase.job.ts tự quyết định bỏ qua mã hoá + log cảnh báo,
  // KHÔNG throw ở đây (không muốn 1 tính năng phụ làm sập toàn bộ server lúc khởi động).
  backupEncryptionPublicKeyPem: raw.BACKUP_ENCRYPTION_PUBLIC_KEY
    ? Buffer.from(raw.BACKUP_ENCRYPTION_PUBLIC_KEY, "base64").toString("utf8")
    : undefined,
} as const;
