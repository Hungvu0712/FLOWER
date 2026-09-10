import { describe, expect, it } from "vitest";
import { slugify } from "@/shared/utils/slugify";

describe("slugify", () => {
  it("bỏ dấu tiếng Việt và chuyển về chữ thường", () => {
    expect(slugify("Hoa Sinh Nhật")).toBe("hoa-sinh-nhat");
    expect(slugify("Hoa cưới")).toBe("hoa-cuoi");
    expect(slugify("Lẵng hoa khai trương")).toBe("lang-hoa-khai-truong");
  });

  it('xử lý đúng chữ "đ" (không nằm trong dải dấu tổ hợp Unicode)', () => {
    expect(slugify("Đào")).toBe("dao");
    expect(slugify("Hoa đồng tiền")).toBe("hoa-dong-tien");
    expect(slugify("ĐỖ QUYÊN")).toBe("do-quyen");
  });

  it("gộp mọi ký tự không phải chữ/số thành một dấu gạch ngang", () => {
    expect(slugify("Hoa   hồng --- đỏ!!!")).toBe("hoa-hong-do");
    expect(slugify("Hoa & Quà (tặng)")).toBe("hoa-qua-tang");
  });

  it("cắt dấu gạch ngang thừa ở đầu/cuối", () => {
    expect(slugify("  --- Hoa lan ---  ")).toBe("hoa-lan");
    expect(slugify("!!!")).toBe("");
  });

  it("giữ nguyên chuỗi đã là slug hợp lệ (idempotent)", () => {
    expect(slugify("hoa-sinh-nhat")).toBe("hoa-sinh-nhat");
    expect(slugify(slugify("Hoa Sinh Nhật"))).toBe("hoa-sinh-nhat");
  });

  it("giữ lại chữ số", () => {
    expect(slugify("Combo 20/10")).toBe("combo-20-10");
  });
});
