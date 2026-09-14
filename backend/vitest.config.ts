import path from "node:path";
import { defaultExclude, defineConfig } from "vitest/config";

const srcDir = path.resolve(__dirname, "src");
// Mọi import tới `config/prisma` (dù viết bằng đường dẫn tương đối trong module hay alias "@/")
// đều được thay bằng mock — test unit/integration KHÔNG chạm database thật.
// Xem docs/08-kiem-thu.md.
const prismaMock = path.resolve(__dirname, "tests/mocks/prisma.mock.ts");

export default defineConfig({
  resolve: {
    alias: [
      { find: /^(?:\.{1,2}\/)+config\/prisma$/, replacement: prismaMock },
      { find: /^@\/config\/prisma$/, replacement: prismaMock },
      { find: /^@\//, replacement: `${srcDir}/` },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // tests/db/ chạy DB Postgres THẬT qua config riêng (vitest.config.db.ts, script `npm run test:db`)
    // — phải loại trừ ở đây, nếu không suite mặc định (Prisma MOCK) sẽ tự nhặt luôn các file đó và
    // fail chắc chắn (mock không có Testcontainers/globalSetup, prisma.* trả về undefined). Bug thật
    // phát hiện lúc thêm tầng test này — `include` gốc là glob rộng, không tự loại trừ thư mục con.
    // Giữ nguyên defaultExclude (node_modules, dist, .git...) — tự khai `exclude` sẽ THAY THẾ hoàn
    // toàn danh sách mặc định của Vitest, không tự gộp thêm.
    exclude: [...defaultExclude, "tests/db/**"],
    setupFiles: ["tests/setup.ts"],
    restoreMocks: true,
    coverage: {
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/server.ts", "src/types/**", "src/config/r2.ts"],
    },
  },
});
