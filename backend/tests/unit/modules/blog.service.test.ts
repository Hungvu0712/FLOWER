import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import * as auditLog from "@/modules/core/audit-log/auditLog.service";
import * as filesService from "@/modules/core/files/files.service";
import * as service from "@/modules/domain/blog/blog.service";

const ACTOR = "admin-1";

beforeEach(() => {
  resetPrismaMock();
  vi.spyOn(auditLog, "record").mockResolvedValue(undefined);
  vi.spyOn(filesService, "setEntityFile").mockResolvedValue(undefined);
  vi.spyOn(filesService, "clearEntityFile").mockResolvedValue(undefined);
});

describe("listPublic — storefront", () => {
  it("CHỈ lấy bài ĐÃ XUẤT BẢN (publishedAt <= now), chưa xoá mềm", async () => {
    db.blogPost.findMany.mockResolvedValue([]);
    db.blogPost.count.mockResolvedValue(0);
    await service.listPublic({ page: 1, limit: 10 } as never);
    const where = db.blogPost.findMany.mock.calls[0]![0].where;
    expect(where.deletedAt).toBeNull();
    expect(where.publishedAt.lte).toBeInstanceOf(Date);
  });
});

describe("getPublicBySlug", () => {
  it("404 khi bài không tồn tại/chưa xuất bản/đã xoá", async () => {
    db.blogPost.findFirst.mockResolvedValue(null);
    await expect(service.getPublicBySlug("khong-co")).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
    });
  });

  it("trả bài viết khi tồn tại và đã xuất bản", async () => {
    db.blogPost.findFirst.mockResolvedValue({ id: "b1", slug: "hoa-dep" });
    const post = await service.getPublicBySlug("hoa-dep");
    expect(post).toMatchObject({ id: "b1" });
  });
});

describe("listAdmin — lấy CẢ draft lẫn đã xuất bản", () => {
  it("KHÔNG lọc theo publishedAt (khác listPublic)", async () => {
    db.blogPost.findMany.mockResolvedValue([]);
    db.blogPost.count.mockResolvedValue(0);
    await service.listAdmin({ page: 1, limit: 24 } as never);
    expect(db.blogPost.findMany.mock.calls[0]![0].where).toEqual({ deletedAt: null });
  });
});

describe("create", () => {
  it("tự sinh slug từ title khi không truyền slug", async () => {
    db.blogPost.findFirst.mockResolvedValue(null);
    db.blogPost.create.mockResolvedValue({ id: "b1" });
    await service.create(ACTOR, {
      title: "Hoa Sinh Nhật Đẹp",
      content: "<p>Nội dung</p>",
    } as never);
    expect(db.blogPost.create.mock.calls[0]![0].data.slug).toBe("hoa-sinh-nhat-dep");
  });

  it("gán authorId = actor đang tạo", async () => {
    db.blogPost.findFirst.mockResolvedValue(null);
    db.blogPost.create.mockResolvedValue({ id: "b1" });
    await service.create(ACTOR, { title: "X", content: "<p>Y</p>" } as never);
    expect(db.blogPost.create.mock.calls[0]![0].data.authorId).toBe(ACTOR);
  });

  it("sanitize content bằng allowlist thẻ trước khi lưu (giống Products)", async () => {
    db.blogPost.findFirst.mockResolvedValue(null);
    db.blogPost.create.mockResolvedValue({ id: "b1" });
    await service.create(ACTOR, {
      title: "X",
      content: "<p>ok</p><script>alert(1)</script>",
    } as never);
    expect(db.blogPost.create.mock.calls[0]![0].data.content).not.toContain("<script>");
  });

  it("bỏ trống publishedAt → lưu draft (null)", async () => {
    db.blogPost.findFirst.mockResolvedValue(null);
    db.blogPost.create.mockResolvedValue({ id: "b1" });
    await service.create(ACTOR, { title: "X", content: "<p>Y</p>" } as never);
    expect(db.blogPost.create.mock.calls[0]![0].data.publishedAt).toBeNull();
  });

  it("đánh dấu thumbnail đang được dùng để job dọn file mồ côi không xoá nhầm", async () => {
    db.blogPost.findFirst.mockResolvedValue(null);
    db.blogPost.create.mockResolvedValue({ id: "b1" });
    await service.create(ACTOR, {
      title: "X",
      content: "<p>Y</p>",
      thumbnailFileId: "file-1",
    } as never);
    expect(filesService.setEntityFile).toHaveBeenCalledWith({
      fileId: "file-1",
      entityType: "blog_post_thumbnail",
      entityId: "b1",
    });
  });

  it("ghi audit log khi tạo bài viết", async () => {
    db.blogPost.findFirst.mockResolvedValue(null);
    db.blogPost.create.mockResolvedValue({ id: "b1" });
    await service.create(ACTOR, { title: "X", content: "<p>Y</p>" } as never);
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "blog_post.create", entityType: "blog_post" }),
    );
  });
});

describe("update", () => {
  it("404 khi bài viết không tồn tại", async () => {
    db.blogPost.findFirst.mockResolvedValue(null);
    await expect(service.update(ACTOR, "khong-co", {} as never)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("đổi TIÊU ĐỀ không tự đổi slug (tránh gãy link đã chia sẻ)", async () => {
    db.blogPost.findFirst.mockResolvedValue({ id: "b1", slug: "hoa-dep" });
    db.blogPost.update.mockResolvedValue({ id: "b1" });
    await service.update(ACTOR, "b1", { title: "Hoa đẹp hơn" } as never);
    expect(db.blogPost.update.mock.calls[0]![0].data).not.toHaveProperty("slug");
  });

  it("gỡ hẳn thumbnail (thumbnailFileId: null) → gọi clearEntityFile", async () => {
    db.blogPost.findFirst.mockResolvedValue({ id: "b1" });
    db.blogPost.update.mockResolvedValue({ id: "b1" });
    await service.update(ACTOR, "b1", { thumbnailFileId: null } as never);
    expect(filesService.clearEntityFile).toHaveBeenCalledWith("blog_post_thumbnail", "b1");
    expect(filesService.setEntityFile).not.toHaveBeenCalled();
  });

  it("đổi sang thumbnail khác → gọi setEntityFile với fileId mới", async () => {
    db.blogPost.findFirst.mockResolvedValue({ id: "b1" });
    db.blogPost.update.mockResolvedValue({ id: "b1" });
    await service.update(ACTOR, "b1", { thumbnailFileId: "file-2" } as never);
    expect(filesService.setEntityFile).toHaveBeenCalledWith({
      fileId: "file-2",
      entityType: "blog_post_thumbnail",
      entityId: "b1",
    });
  });

  it("ghi audit log khi sửa bài viết", async () => {
    db.blogPost.findFirst.mockResolvedValue({ id: "b1" });
    db.blogPost.update.mockResolvedValue({ id: "b1" });
    await service.update(ACTOR, "b1", { title: "Mới" } as never);
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "blog_post.update", entityType: "blog_post" }),
    );
  });
});

describe("remove", () => {
  it("404 khi bài viết không tồn tại", async () => {
    db.blogPost.findFirst.mockResolvedValue(null);
    await expect(service.remove(ACTOR, "khong-co")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("soft delete (deletedAt), KHÔNG hard delete", async () => {
    db.blogPost.findFirst.mockResolvedValue({ id: "b1" });
    db.blogPost.update.mockResolvedValue({ id: "b1" });
    await service.remove(ACTOR, "b1");
    expect(db.blogPost.update).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { deletedAt: expect.any(Date) },
    });
    expect(db.blogPost.delete).not.toHaveBeenCalled();
  });

  it("ghi audit log khi xoá", async () => {
    db.blogPost.findFirst.mockResolvedValue({ id: "b1" });
    db.blogPost.update.mockResolvedValue({ id: "b1" });
    await service.remove(ACTOR, "b1");
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "blog_post.delete", entityType: "blog_post" }),
    );
  });
});
