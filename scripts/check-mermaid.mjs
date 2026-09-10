/**
 * Kiểm tra cú pháp mọi sơ đồ Mermaid trong docs/ — chạy trước khi commit tài liệu có sơ đồ.
 *
 * Cách chạy (mermaid + jsdom cài tạm, KHÔNG thêm vào dependencies của dự án):
 *   npm install --no-save --prefix /tmp/mermaid-check mermaid@11 jsdom@26
 *   NODE_PATH=/tmp/mermaid-check/node_modules node scripts/check-mermaid.mjs
 *
 * Lỗi hay gặp mà script này bắt được:
 *   - Dấu nháy kép escape bằng \" trong nhãn (Mermaid KHÔNG hỗ trợ escape bằng backslash)
 *   - Thiếu ngoặc/ngoặc kép trong nhãn node
 *   - Sai từ khoá loại sơ đồ
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const DOCS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "docs");

let JSDOM;
try {
  ({ JSDOM } = require("jsdom"));
} catch {
  console.error("Thiếu jsdom/mermaid — xem hướng dẫn cài tạm ở đầu file này.");
  process.exit(2);
}

const dom = new JSDOM("<!doctype html><body></body>", { pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.SVGElement = dom.window.SVGElement;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });

// `import("mermaid")` không tra NODE_PATH (chỉ `require` mới tra), nên phải tự phân giải
// đường dẫn thật của package rồi import theo file URL.
const mermaidPkgPath = require.resolve("mermaid/package.json");
const mermaidPkg = JSON.parse(readFileSync(mermaidPkgPath, "utf8"));
const entry = mermaidPkg.exports?.["."]?.import?.default ?? mermaidPkg.module ?? mermaidPkg.main;
const { default: mermaid } = await import(
  pathToFileURL(resolvePath(dirname(mermaidPkgPath), entry)).href
);
mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return path.endsWith(".md") ? [path] : [];
  });
}

let total = 0;
const failures = [];

for (const file of walk(DOCS_DIR)) {
  const blocks = [...readFileSync(file, "utf8").matchAll(/```mermaid\n([\s\S]*?)```/g)];
  for (const [index, match] of blocks.entries()) {
    total += 1;
    try {
      await mermaid.parse(match[1]);
    } catch (err) {
      failures.push({ file, index: index + 1, message: String(err?.message ?? err).split("\n")[0] });
    }
  }
}

console.log(`Đã kiểm tra ${total} sơ đồ Mermaid trong docs/`);
if (failures.length === 0) {
  console.log("✅ Tất cả đều parse thành công.");
} else {
  console.log(`❌ ${failures.length} sơ đồ lỗi:\n`);
  for (const f of failures) console.log(`  ${f.file} (sơ đồ #${f.index}): ${f.message}`);
  process.exit(1);
}
