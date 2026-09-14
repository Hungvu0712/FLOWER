import path from "node:path";
import { defineConfig } from "vitest/config";

const srcDir = path.resolve(__dirname, "src");

// Config RIÊNG cho tests/db/ — khác hẳn vitest.config.ts gốc: giữ nguyên alias "@/" → "src/" (để
// import như "@/config/prisma" resolve được) nhưng KHÔNG alias riêng "config/prisma" sang mock, nên
// PrismaClient trong test này là THẬT, nói chuyện với Postgres thật do Testcontainers dựng (xem
// tests/db/globalSetup.ts). Chạy qua script riêng `npm run test:db`, KHÔNG nằm trong `npm test` mặc
// định — cần Docker, không phải máy nào cũng có sẵn lúc code thường ngày. Xem docs/08-kiem-thu.md §3.4.
export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: `${srcDir}/` }],
  },
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    globalSetup: ["tests/db/globalSetup.ts"],
    setupFiles: ["tests/db/setup.ts"],
    // Toàn bộ file trong tests/db/ dùng CHUNG 1 container Postgres (dựng 1 lần ở globalSetup) — ép
    // chạy tuần tự (1 fork) để các test không đụng dữ liệu của nhau.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30_000,
    hookTimeout: 60_000, // globalSetup cần thời gian kéo image + dựng container + migrate deploy
  },
});
