import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "@/app";
import { resetPrismaMock } from "../mocks/prisma.mock";
import { db, loginAs } from "./helpers";
import * as filesService from "@/modules/core/files/files.service";

let adminCookie: string[];

beforeEach(() => {
  resetPrismaMock();
  adminCookie = loginAs("admin-1", ["admin"], ["categories.manage"]);
  db.auditLog.create.mockResolvedValue({});
  vi.spyOn(filesService, "setEntityFile").mockResolvedValue(undefined);
});

describe("POST /api/v1/admin/categories", () => {
  it("tạo danh mục, tự sinh slug từ tên tiếng Việt, trả 201", async () => {
    db.category.findFirst.mockResolvedValue(null);
    db.category.create.mockResolvedValue({ id: "c1", name: "Hoa cưới", slug: "hoa-cuoi" });

    const res = await request(app)
      .post("/api/v1/admin/categories")
      .set("Cookie", adminCookie)
      .send({ name: "Hoa cưới" });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Created");
    expect(db.category.create.mock.calls[0]![0].data.slug).toBe("hoa-cuoi");
  });

  it("422 khi thiếu tên", async () => {
    const res = await request(app).post("/api/v1/admin/categories").set("Cookie", adminCookie).send({});
    expect(res.status).toBe(422);
    expect(res.body.errors).toHaveProperty("name");
  });

  it("404 khi danh mục cha không tồn tại", async () => {
    db.category.findFirst.mockResolvedValue(null);
    db.category.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/v1/admin/categories")
      .set("Cookie", adminCookie)
      .send({ name: "Con", parentId: "66666666-6666-6666-6666-666666666666" });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("PARENT_NOT_FOUND");
  });
});

describe("PATCH /api/v1/admin/categories/:id", () => {
  it("400 CATEGORY_CYCLE khi chọn chính nó làm cha", async () => {
    const id = "77777777-7777-7777-7777-777777777777";
    db.category.findUnique.mockResolvedValue({ id });
    const res = await request(app)
      .patch(`/api/v1/admin/categories/${id}`)
      .set("Cookie", adminCookie)
      .send({ parentId: id });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("CATEGORY_CYCLE");
  });

  it("422 khi :id không phải UUID", async () => {
    const res = await request(app)
      .patch("/api/v1/admin/categories/abc")
      .set("Cookie", adminCookie)
      .send({ name: "X" });
    expect(res.status).toBe(422);
  });
});

describe("DELETE /api/v1/admin/categories/:id", () => {
  it("409 khi còn danh mục con", async () => {
    const id = "88888888-8888-8888-8888-888888888888";
    db.category.findUnique.mockResolvedValue({ id, _count: { children: 3 } });
    const res = await request(app).delete(`/api/v1/admin/categories/${id}`).set("Cookie", adminCookie);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("CATEGORY_HAS_CHILDREN");
  });

  it("xoá được danh mục lá", async () => {
    const id = "99999999-9999-9999-9999-999999999999";
    db.category.findUnique.mockResolvedValue({ id, _count: { children: 0 } });
    db.category.delete.mockResolvedValue({});
    const res = await request(app).delete(`/api/v1/admin/categories/${id}`).set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Đã xoá danh mục");
  });
});
