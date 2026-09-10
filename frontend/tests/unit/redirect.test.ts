import { beforeEach, describe, expect, it } from "vitest";
import { getRedirectTarget } from "@/lib/redirect";

function setSearch(search: string) {
  window.history.replaceState({}, "", `/login${search}`);
}

beforeEach(() => setSearch(""));

describe("getRedirectTarget — chống open redirect", () => {
  it("trả về path nội bộ hợp lệ", () => {
    setSearch("?redirectTo=/superadmin/users");
    expect(getRedirectTarget()).toBe("/superadmin/users");
  });

  it("CHẶN redirect ra domain khác dạng //evil.com", () => {
    setSearch("?redirectTo=//ke-tan-cong.example/phishing");
    expect(getRedirectTarget()).toBe("/");
  });

  it("CHẶN URL tuyệt đối http/https", () => {
    setSearch("?redirectTo=https://ke-tan-cong.example");
    expect(getRedirectTarget()).toBe("/");
  });

  it("CHẶN path không bắt đầu bằng /", () => {
    setSearch("?redirectTo=superadmin/users");
    expect(getRedirectTarget()).toBe("/");
  });

  it("không có redirectTo → dùng fallback", () => {
    expect(getRedirectTarget()).toBe("/");
    expect(getRedirectTarget("/account/profile")).toBe("/account/profile");
  });

  it("giữ nguyên query string trong path nội bộ", () => {
    setSearch("?redirectTo=%2Fadmin%2Fcategories%3Fpage%3D2");
    expect(getRedirectTarget()).toBe("/admin/categories?page=2");
  });
});
