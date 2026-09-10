import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "@/app";
import { resetPrismaMock } from "../mocks/prisma.mock";
import { db, loginAs } from "./helpers";
import * as filesService from "@/modules/core/files/files.service";

let adminCookie: string[];

beforeEach(() => {
  resetPrismaMock();
  adminCookie = loginAs("admin-1", ["admin"], ["products.manage"]);
  db.auditLog.create.mockResolvedValue({});
  vi.spyOn(filesService, "syncEntityFiles").mockResolvedValue(undefined);
  db.product.findUniqueOrThrow.mockResolvedValue({ id: "p1" });
});

describe("POST /api/v1/admin/products", () => {
  it("tạo sản phẩm, tự sinh slug từ tên tiếng Việt, trả 201", async () => {
    db.product.findFirst.mockResolvedValue(null);
    db.product.create.mockResolvedValue({ id: "p1", name: "Hoa cưới", slug: "hoa-cuoi" });

    const res = await request(app)
      .post("/api/v1/admin/products")
      .set("Cookie", adminCookie)
      .send({ name: "Hoa cưới", basePrice: 500000 });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Created");
    expect(db.product.create.mock.calls[0]![0].data.slug).toBe("hoa-cuoi");
  });

  it("422 khi thiếu basePrice", async () => {
    const res = await request(app)
      .post("/api/v1/admin/products")
      .set("Cookie", adminCookie)
      .send({ name: "Hoa cưới" });
    expect(res.status).toBe(422);
    expect(res.body.errors).toHaveProperty("basePrice");
  });

  it("404 CATEGORY_NOT_FOUND khi categoryId không tồn tại", async () => {
    db.product.findFirst.mockResolvedValue(null);
    db.category.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/v1/admin/products")
      .set("Cookie", adminCookie)
      .send({ name: "X", basePrice: 1000, categoryId: "66666666-6666-6666-6666-666666666666" });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("CATEGORY_NOT_FOUND");
  });
});

describe("PATCH /api/v1/admin/products/:id", () => {
  it("422 khi :id không phải UUID", async () => {
    const res = await request(app)
      .patch("/api/v1/admin/products/abc")
      .set("Cookie", adminCookie)
      .send({ name: "X" });
    expect(res.status).toBe(422);
  });

  it("404 khi sản phẩm không tồn tại", async () => {
    const id = "77777777-7777-7777-7777-777777777777";
    db.product.findFirst.mockResolvedValue(null);
    const res = await request(app).patch(`/api/v1/admin/products/${id}`).set("Cookie", adminCookie).send({ name: "X" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/v1/admin/products/:id", () => {
  it("xoá mềm thành công", async () => {
    const id = "99999999-9999-9999-9999-999999999999";
    db.product.findFirst.mockResolvedValue({ id });
    db.product.update.mockResolvedValue({});
    const res = await request(app).delete(`/api/v1/admin/products/${id}`).set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Đã xoá sản phẩm");
  });

  it("404 khi sản phẩm không tồn tại hoặc đã xoá trước đó", async () => {
    const id = "99999999-9999-9999-9999-999999999998";
    db.product.findFirst.mockResolvedValue(null);
    const res = await request(app).delete(`/api/v1/admin/products/${id}`).set("Cookie", adminCookie);
    expect(res.status).toBe(404);
  });
});

describe("member KHÔNG có products.manage", () => {
  it("403 khi gọi bất kỳ endpoint quản trị sản phẩm nào", async () => {
    const memberCookie = loginAs("member-1", ["member"], []);
    const res = await request(app).get("/api/v1/admin/products").set("Cookie", memberCookie);
    expect(res.status).toBe(403);
  });
});
