import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Test frontend chạy tách khỏi Next.js runtime: chỉ kiểm thử logic thuần (lib, store, service, schema)
// và component không phụ thuộc server. Luồng người dùng đầy đủ do Playwright đảm nhiệm (thư mục e2e/).
// Xem docs/08-kiem-thu.md.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**"],
    restoreMocks: true,
    coverage: {
      reporter: ["text", "html"],
      include: ["src/lib/**", "src/store/**", "src/features/**", "src/components/ui/**", "src/proxy.ts"],
    },
  },
});
