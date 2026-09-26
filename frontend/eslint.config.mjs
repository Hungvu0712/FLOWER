import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // review-source CODE-01 (25/09/2026) — dòng console.log DEBUG từng lọt vào commit thật lúc điều tra
  // bug đăng nhập (docs/12 FE-08/FE-09) rồi quên xoá hết, phải dọn lại sau. console.warn/error vẫn cho
  // phép (error.tsx/global-error.tsx dùng console.error đúng chỗ — lỗi không bắt được ở đâu khác để log).
  { rules: { "no-console": ["error", { allow: ["warn", "error"] }] } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
