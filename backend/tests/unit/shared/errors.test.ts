import { describe, expect, it } from "vitest";
import { AppError, ValidationError } from "@/shared/errors";

describe("AppError", () => {
  it("mặc định 400 / BAD_REQUEST", () => {
    const err = new AppError("Sai dữ liệu");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("BAD_REQUEST");
    expect(err.message).toBe("Sai dữ liệu");
  });

  it("nhận statusCode và code tuỳ chỉnh", () => {
    const err = new AppError("Không có quyền", 403, "FORBIDDEN");
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
  });

  it("đánh dấu isOperational — phân biệt lỗi nghiệp vụ với bug hệ thống", () => {
    expect(new AppError("x").isOperational).toBe(true);
  });

  it("vẫn là instance của Error (bắt được bằng catch thường)", () => {
    const err = new AppError("x");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("AppError");
    expect(err.stack).toBeDefined();
  });
});

describe("ValidationError", () => {
  it("luôn 422 / VALIDATION_ERROR với message cố định", () => {
    const err = new ValidationError({ email: "Email không hợp lệ" });
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toBe("Validation failed");
  });

  it("giữ nguyên lỗi theo từng field", () => {
    const errors = { email: "Email không hợp lệ", password: "Tối thiểu 8 ký tự" };
    expect(new ValidationError(errors).errors).toEqual(errors);
  });

  it("kế thừa AppError nên errorHandler bắt được cả hai nhánh", () => {
    expect(new ValidationError({})).toBeInstanceOf(AppError);
  });
});
