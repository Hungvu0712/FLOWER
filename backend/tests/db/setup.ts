import { inject } from "vitest";
import "../setup";

// Tái dùng baseline biến môi trường giả (JWT secret, v.v.) từ tests/setup.ts — chỉ GHI ĐÈ
// DATABASE_URL bằng connection string thật của container do globalSetup.ts dựng. Phải chạy TRƯỚC khi
// file test import "@/app"/"@/config/prisma" — Vitest đảm bảo setupFiles chạy xong trước khi import
// tĩnh của file test được resolve, đúng cơ chế "../setup" đang dùng cho JWT secret giả ở
// tests/integration/.
process.env.DATABASE_URL = inject("dbUrl");
