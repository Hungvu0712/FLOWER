import path from "node:path";
import { defineConfig } from "vitest/config";

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
    setupFiles: ["tests/setup.ts"],
    restoreMocks: true,
    coverage: {
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/server.ts", "src/types/**", "src/config/r2.ts"],
    },
  },
});
