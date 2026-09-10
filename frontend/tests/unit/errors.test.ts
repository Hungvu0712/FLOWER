import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { getErrorMessage } from "@/lib/errors";

function axiosErrorWith(data: unknown, status = 400): AxiosError {
  const err = new AxiosError("Request failed");
  err.response = { data, status, statusText: "", headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() } };
  return err;
}

describe("getErrorMessage", () => {
  it("lấy đúng message nghiệp vụ backend trả về thay vì câu chung chung", () => {
    const err = axiosErrorWith({ success: false, message: "Vẫn còn danh mục con", code: "CATEGORY_HAS_CHILDREN" }, 409);
    expect(getErrorMessage(err, "Không xoá được")).toBe("Vẫn còn danh mục con");
  });

  it("dùng fallback khi response không có message", () => {
    expect(getErrorMessage(axiosErrorWith({ success: false }), "Không xoá được")).toBe("Không xoá được");
  });

  it("dùng fallback khi message không phải chuỗi", () => {
    expect(getErrorMessage(axiosErrorWith({ message: { vi: "x" } }), "Fallback")).toBe("Fallback");
  });

  it("dùng fallback cho lỗi không phải AxiosError (vd lỗi mạng, lỗi JS)", () => {
    expect(getErrorMessage(new TypeError("boom"), "Fallback")).toBe("Fallback");
    expect(getErrorMessage("chuỗi lỗi", "Fallback")).toBe("Fallback");
    expect(getErrorMessage(null, "Fallback")).toBe("Fallback");
  });

  it("AxiosError không có response (mất mạng) → fallback", () => {
    expect(getErrorMessage(new AxiosError("Network Error"), "Mất kết nối")).toBe("Mất kết nối");
  });
});
