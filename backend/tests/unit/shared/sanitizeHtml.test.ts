import { describe, expect, it } from "vitest";
import { sanitizeDescriptionHtml } from "@/shared/utils/sanitizeHtml";

describe("sanitizeDescriptionHtml", () => {
  it("giữ lại các thẻ định dạng cơ bản khớp bộ nút RichTextEditor", () => {
    const html =
      "<p>Bó hoa <strong>hồng đỏ</strong> <em>tươi</em>, gồm:</p><ul><li>10 bông hồng</li></ul>";
    expect(sanitizeDescriptionHtml(html)).toBe(html);
  });

  it("xoá sạch thẻ <script> và nội dung bên trong (chống XSS lưu trữ)", () => {
    const result = sanitizeDescriptionHtml("<p>Mô tả</p><script>alert(document.cookie)</script>");
    expect(result).toBe("<p>Mô tả</p>");
    expect(result).not.toContain("script");
    expect(result).not.toContain("alert");
  });

  it("xoá mọi attribute, kể cả href/onclick — mô tả sản phẩm không cần link", () => {
    const result = sanitizeDescriptionHtml(
      '<p onclick="alert(1)">Click</p><a href="javascript:alert(1)">link</a>',
    );
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("javascript:");
    expect(result).not.toContain("href");
  });

  it("hạ cấp thẻ không nằm trong allowlist (vd <div>, <img>) xuống còn nội dung bên trong", () => {
    const result = sanitizeDescriptionHtml('<div><img src="x.jpg">Hoa lan</div>');
    expect(result).toBe("Hoa lan");
  });

  it("chuỗi rỗng trả về chuỗi rỗng", () => {
    expect(sanitizeDescriptionHtml("")).toBe("");
  });
});
