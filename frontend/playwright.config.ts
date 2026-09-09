import { defineConfig, devices } from "@playwright/test";

// E2E chạy trên hệ thống THẬT: cần backend (localhost:4000) + frontend (localhost:3000) + database
// đã migrate & seed. Xem hướng dẫn ở docs/08-kiem-thu.md §4.
//
// Chạy:  npm run test:e2e            (tự khởi động `next dev`, backend phải tự chạy trước)
//        npm run test:e2e -- --ui    (chế độ giao diện, debug từng bước)
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // các luồng auth dùng chung tài khoản seed → chạy tuần tự cho ổn định
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "vi-VN",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
