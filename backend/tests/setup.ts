// Biến môi trường tối thiểu để `config/env.ts` không fail-fast khi chạy test.
// KHÔNG dùng giá trị thật ở đây — test không kết nối database/dịch vụ ngoài nào.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-do-not-use-in-production";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-do-not-use-in-production";
process.env.JWT_ACCESS_EXPIRES_IN = "5m";
process.env.COOKIE_SECRET = "test-cookie-secret";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.EMAIL_PROVIDER = "smtp";
process.env.EMAIL_FROM = "no-reply@test.local";
process.env.R2_BUCKET = "test-bucket";
process.env.R2_PUBLIC_URL = "https://cdn.test.local";
process.env.R2_ACCOUNT_ID = "test-account";
process.env.R2_ACCESS_KEY_ID = "test-key";
process.env.R2_SECRET_ACCESS_KEY = "test-secret";
process.env.LOG_LEVEL = "error";
