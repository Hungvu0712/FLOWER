import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "@/app";
import { resetPrismaMock } from "../mocks/prisma.mock";
import { db, loginAs } from "./helpers";

const ID = "88888888-8888-8888-8888-888888888888";

beforeEach(() => resetPrismaMock());

describe("GET /api/v1/blog (công khai)", () => {
  it("không cần đăng nhập, chỉ trả bài đã xuất bản", async () => {
    db.blogPost.findMany.mockResolvedValue([]);
    db.blogPost.count.mockResolvedValue(0);
    const res = await request(app).get("/api/v1/blog");
    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/blog/:slug (công khai)", () => {
  it("200 khi bài viết tồn tại và đã xuất bản", async () => {
    db.blogPost.findFirst.mockResolvedValue({ id: ID, slug: "hoa-dep", title: "Hoa đẹp" });
    const res = await request(app).get("/api/v1/blog/hoa-dep");
    expect(res.status).toBe(200);
  });

  it("404 khi bài viết không tồn tại/chưa xuất bản", async () => {
    db.blogPost.findFirst.mockResolvedValue(null);
    const res = await request(app).get("/api/v1/blog/khong-co");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/v1/admin/blog", () => {
  it("401 khi chưa đăng nhập", async () => {
    const res = await request(app).get("/api/v1/admin/blog");
    expect(res.status).toBe(401);
  });

  it("403 khi thiếu permission blog.manage", async () => {
    const cookie = loginAs("staff-1", ["sales_staff"], ["orders.view_all"]);
    const res = await request(app).get("/api/v1/admin/blog").set("Cookie", cookie);
    expect(res.status).toBe(403);
  });

  it("200 khi đủ quyền blog.manage — lấy CẢ draft", async () => {
    const cookie = loginAs("admin-1", ["admin"], ["blog.manage"]);
    db.blogPost.findMany.mockResolvedValue([]);
    db.blogPost.count.mockResolvedValue(0);
    const res = await request(app).get("/api/v1/admin/blog").set("Cookie", cookie);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/v1/admin/blog", () => {
  it("tạo thành công, trả 201", async () => {
    const cookie = loginAs("admin-1", ["admin"], ["blog.manage"]);
    db.blogPost.findFirst.mockResolvedValue(null);
    db.blogPost.create.mockResolvedValue({ id: ID, title: "Bài mới", slug: "bai-moi" });
    const res = await request(app)
      .post("/api/v1/admin/blog")
      .set("Cookie", cookie)
      .send({ title: "Bài mới", content: "<p>Nội dung</p>" });
    expect(res.status).toBe(201);
  });

  it("422 khi thiếu content", async () => {
    const cookie = loginAs("admin-1", ["admin"], ["blog.manage"]);
    const res = await request(app)
      .post("/api/v1/admin/blog")
      .set("Cookie", cookie)
      .send({ title: "Bài mới" });
    expect(res.status).toBe(422);
  });
});

describe("PATCH /api/v1/admin/blog/:id", () => {
  it("404 khi bài viết không tồn tại", async () => {
    const cookie = loginAs("admin-1", ["admin"], ["blog.manage"]);
    db.blogPost.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .patch(`/api/v1/admin/blog/${ID}`)
      .set("Cookie", cookie)
      .send({ title: "Sửa" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/v1/admin/blog/:id", () => {
  it("xoá thành công (soft delete)", async () => {
    const cookie = loginAs("admin-1", ["admin"], ["blog.manage"]);
    db.blogPost.findFirst.mockResolvedValue({ id: ID });
    db.blogPost.update.mockResolvedValue({ id: ID });
    const res = await request(app).delete(`/api/v1/admin/blog/${ID}`).set("Cookie", cookie);
    expect(res.status).toBe(200);
  });
});
