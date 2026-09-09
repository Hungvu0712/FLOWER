import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authenticate } from "@/shared/middleware/authenticate";
import { signAccessToken } from "@/shared/utils/jwt";
import { AppError } from "@/shared/errors";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";


function ctx(cookies: Record<string, string> = {}, headers: Record<string, string> = {}) {
  const req = { cookies, headers, requestId: "req-1" } as unknown as Request;
  const res = {} as Response;
  const next = vi.fn() as unknown as NextFunction & ReturnType<typeof vi.fn>;
  return { req, res, next };
}

async function run(c: ReturnType<typeof ctx>) {
  authenticate(c.req, c.res, c.next);
  await vi.waitFor(() => expect(c.next).toHaveBeenCalled());
}

describe("authenticate", () => {
  beforeEach(() => resetPrismaMock());

  it("đọc token từ cookie access_token và nạp role/permission HIỆN TẠI từ DB", async () => {
    db.userRole.findMany.mockResolvedValue([
      {
        role: {
          code: "admin",
          permissions: [{ permission: { code: "files.manage" } }, { permission: { code: "products.view" } }],
        },
      },
    ]);
    const c = ctx({ access_token: signAccessToken({ sub: "user-1" }) });
    await run(c);

    expect(c.next).toHaveBeenCalledWith();
    expect(c.req.user).toEqual({
      id: "user-1",
      roles: ["admin"],
      permissions: ["files.manage", "products.view"],
    });
    expect(db.userRole.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
  });

  it("chấp nhận Authorization: Bearer cho client không phải trình duyệt", async () => {
    db.userRole.findMany.mockResolvedValue([]);
    const c = ctx({}, { authorization: `Bearer ${signAccessToken({ sub: "user-2" })}` });
    await run(c);
    expect(c.req.user?.id).toBe("user-2");
  });

  it("ưu tiên cookie hơn header khi có cả hai", async () => {
    db.userRole.findMany.mockResolvedValue([]);
    const c = ctx(
      { access_token: signAccessToken({ sub: "tu-cookie" }) },
      { authorization: `Bearer ${signAccessToken({ sub: "tu-header" })}` },
    );
    await run(c);
    expect(c.req.user?.id).toBe("tu-cookie");
  });

  it("gộp permission trùng nhau từ nhiều role thành danh sách duy nhất", async () => {
    db.userRole.findMany.mockResolvedValue([
      { role: { code: "admin", permissions: [{ permission: { code: "orders.view_all" } }] } },
      {
        role: {
          code: "sales_staff",
          permissions: [{ permission: { code: "orders.view_all" } }, { permission: { code: "customers.view" } }],
        },
      },
    ]);
    const c = ctx({ access_token: signAccessToken({ sub: "user-3" }) });
    await run(c);
    expect(c.req.user?.roles).toEqual(["admin", "sales_staff"]);
    expect(c.req.user?.permissions).toEqual(["orders.view_all", "customers.view"]);
  });

  it("401 UNAUTHENTICATED khi không có token", async () => {
    const c = ctx();
    await run(c);
    const err = c.next.mock.calls[0]![0] as AppError;
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("UNAUTHENTICATED");
    expect(db.userRole.findMany).not.toHaveBeenCalled();
  });

  it("401 INVALID_TOKEN khi token ký bằng secret khác", async () => {
    const c = ctx({ access_token: jwt.sign({ sub: "kẻ giả mạo" }, "secret-khac") });
    await run(c);
    expect((c.next.mock.calls[0]![0] as AppError).code).toBe("INVALID_TOKEN");
  });

  it("401 INVALID_TOKEN khi token hết hạn", async () => {
    const expired = jwt.sign({ sub: "u" }, process.env.JWT_ACCESS_SECRET!, { expiresIn: "-1s" });
    const c = ctx({ access_token: expired });
    await run(c);
    expect((c.next.mock.calls[0]![0] as AppError).code).toBe("INVALID_TOKEN");
  });

  it("user không có role nào → permissions rỗng, KHÔNG phải lỗi", async () => {
    db.userRole.findMany.mockResolvedValue([]);
    const c = ctx({ access_token: signAccessToken({ sub: "user-moi" }) });
    await run(c);
    expect(c.next).toHaveBeenCalledWith();
    expect(c.req.user).toEqual({ id: "user-moi", roles: [], permissions: [] });
  });
});
