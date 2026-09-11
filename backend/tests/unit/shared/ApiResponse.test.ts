import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { buildPaginationMeta, created, ok, paginated } from "@/shared/response/ApiResponse";

function mockRes() {
  const res = {} as Response & { json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> };
  res.json = vi.fn().mockReturnValue(res);
  res.status = vi.fn().mockReturnValue(res);
  return res;
}

describe("ok", () => {
  it("trả envelope chuẩn với status 200", () => {
    const res = mockRes();
    ok(res, { id: 1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: "Success", data: { id: 1 } });
  });

  it("nhận message và statusCode tuỳ chỉnh", () => {
    const res = mockRes();
    ok(res, null, "Đã xoá", 202);
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: "Đã xoá", data: null });
  });
});

describe("created", () => {
  it("trả 201", () => {
    const res = mockRes();
    created(res, { id: "abc" });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Created",
      data: { id: "abc" },
    });
  });
});

describe("paginated", () => {
  it("kèm meta phân trang", () => {
    const res = mockRes();
    paginated(res, [{ id: 1 }], { page: 1, limit: 20, total: 100, totalPages: 5 });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Success",
      data: [{ id: 1 }],
      meta: { page: 1, limit: 20, total: 100, totalPages: 5 },
    });
  });
});

describe("buildPaginationMeta", () => {
  it("tính totalPages bằng cách làm tròn lên", () => {
    expect(buildPaginationMeta(1, 20, 100)).toEqual({
      page: 1,
      limit: 20,
      total: 100,
      totalPages: 5,
    });
    expect(buildPaginationMeta(1, 20, 101).totalPages).toBe(6);
    expect(buildPaginationMeta(1, 20, 1).totalPages).toBe(1);
  });

  it("totalPages tối thiểu là 1 kể cả khi không có dữ liệu (tránh hiện 'trang 1/0' trên UI)", () => {
    expect(buildPaginationMeta(1, 20, 0).totalPages).toBe(1);
  });
});
