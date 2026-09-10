import { describe, expect, it } from "vitest";
import { escapeHtml } from "@/shared/utils/escapeHtml";

describe("escapeHtml", () => {
  it("escape đủ 5 ký tự nguy hiểm cho HTML", () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'quote'`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;quote&#39;",
    );
  });

  it("văn bản thường không có ký tự đặc biệt giữ nguyên", () => {
    expect(escapeHtml("Nguyễn Văn A - 0900000000")).toBe("Nguyễn Văn A - 0900000000");
  });

  it("chuỗi rỗng trả về chuỗi rỗng", () => {
    expect(escapeHtml("")).toBe("");
  });
});
