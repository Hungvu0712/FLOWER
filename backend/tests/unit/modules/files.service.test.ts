import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://r2.test/presigned?sig=abc"),
}));
vi.mock("@/config/r2", () => ({ r2Client: { send: vi.fn().mockResolvedValue({}) } }));

const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
const { r2Client } = await import("@/config/r2");
const service = await import("@/modules/core/files/files.service");


beforeEach(() => {
  resetPrismaMock();
  vi.mocked(getSignedUrl).mockResolvedValue("https://r2.test/presigned?sig=abc");
});

describe("getPresignedUploadUrl", () => {
  const input = { originalName: "hoa-hong.jpg", mimeType: "image/jpeg", sizeBytes: 204800 };

  it("KHÔNG dùng tên file gốc làm key — sinh UUID để tránh trùng tên và path traversal", async () => {
    const result = await service.getPresignedUploadUrl(input as never);
    expect(result.r2Key).not.toContain("hoa-hong");
    expect(result.r2Key).toMatch(/^uploads\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.jpg$/);
  });

  it("giữ lại phần mở rộng của file gốc", async () => {
    expect((await service.getPresignedUploadUrl(input as never)).r2Key).toMatch(/\.jpg$/);
    const pdf = await service.getPresignedUploadUrl({ ...input, originalName: "hoa-don.pdf" } as never);
    expect(pdf.r2Key).toMatch(/\.pdf$/);
  });

  it("file không có phần mở rộng vẫn xử lý được", async () => {
    const result = await service.getPresignedUploadUrl({ ...input, originalName: "khong-duoi" } as never);
    expect(result.r2Key).toMatch(/^uploads\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}$/);
  });

  it("URL hết hạn sau 5 phút (SECURITY.md §5 — presigned phải có thời hạn ngắn)", async () => {
    await service.getPresignedUploadUrl(input as never);
    expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), { expiresIn: 300 });
  });

  it("ràng buộc ContentType và ContentLength ngay trong chữ ký", async () => {
    await service.getPresignedUploadUrl(input as never);
    const command = vi.mocked(getSignedUrl).mock.calls[0]![1] as { input: Record<string, unknown> };
    expect(command.input).toMatchObject({ ContentType: "image/jpeg", ContentLength: 204800 });
  });

  it("trả kèm publicUrl để frontend hiển thị ngay sau khi upload", async () => {
    const result = await service.getPresignedUploadUrl(input as never);
    expect(result.publicUrl).toBe(`https://cdn.test.local/${result.r2Key}`);
  });
});

describe("createFileRecord", () => {
  it("ghi metadata kèm người upload", async () => {
    db.file.create.mockResolvedValue({ id: "f1" });
    await service.createFileRecord(
      { r2Key: "uploads/2026-09-09/x.jpg", originalName: "x.jpg", mimeType: "image/jpeg", sizeBytes: 100 } as never,
      "user-1",
    );
    expect(db.file.create.mock.calls[0]![0].data).toMatchObject({
      r2Key: "uploads/2026-09-09/x.jpg",
      url: "https://cdn.test.local/uploads/2026-09-09/x.jpg",
      uploadedBy: "user-1",
    });
  });
});

describe("listFiles", () => {
  it("loại trừ file đã xoá mềm", async () => {
    db.file.findMany.mockResolvedValue([]);
    db.file.count.mockResolvedValue(0);
    await service.listFiles({ page: 1, limit: 24 } as never);
    expect(db.file.findMany.mock.calls[0]![0].where).toMatchObject({ deletedAt: null });
  });

  it("phân trang đúng", async () => {
    db.file.findMany.mockResolvedValue([]);
    db.file.count.mockResolvedValue(50);
    const { meta } = await service.listFiles({ page: 2, limit: 24 } as never);
    expect(db.file.findMany.mock.calls[0]![0]).toMatchObject({ skip: 24, take: 24 });
    expect(meta.totalPages).toBe(3);
  });
});

describe("setEntityFile — đánh dấu tái sử dụng ảnh", () => {
  it("gỡ usage cũ của entity trước khi gắn file mới (1 entity chỉ 1 ảnh đại diện)", async () => {
    db.file.findUnique.mockResolvedValue({ id: "f1", deletedAt: null });
    db.fileUsage.deleteMany.mockResolvedValue({});
    db.fileUsage.create.mockResolvedValue({});

    await service.setEntityFile({ fileId: "f1", entityType: "user_avatar", entityId: "u1" });

    expect(db.fileUsage.deleteMany).toHaveBeenCalledWith({
      where: { entityType: "user_avatar", entityId: "u1" },
    });
    expect(db.fileUsage.create).toHaveBeenCalledWith({
      data: { fileId: "f1", entityType: "user_avatar", entityId: "u1" },
    });
  });

  it("404 khi file không tồn tại hoặc đã xoá mềm", async () => {
    db.file.findUnique.mockResolvedValue(null);
    await expect(
      service.setEntityFile({ fileId: "f1", entityType: "user_avatar", entityId: "u1" }),
    ).rejects.toMatchObject({ statusCode: 404, code: "FILE_NOT_FOUND" });

    db.file.findUnique.mockResolvedValue({ id: "f1", deletedAt: new Date() });
    await expect(
      service.setEntityFile({ fileId: "f1", entityType: "user_avatar", entityId: "u1" }),
    ).rejects.toMatchObject({ code: "FILE_NOT_FOUND" });
  });
});

describe("softDeleteFile", () => {
  it("chỉ đánh dấu deletedAt — R2 object bị purge ở lượt cron sau (khoảng đệm an toàn)", async () => {
    db.file.findUnique.mockResolvedValue({ id: "f1", r2Key: "uploads/x.jpg" });
    db.file.update.mockResolvedValue({});
    await service.softDeleteFile("f1");
    expect(db.file.update).toHaveBeenCalledWith({ where: { id: "f1" }, data: { deletedAt: expect.any(Date) } });
    expect(r2Client.send).not.toHaveBeenCalled();
  });

  it("404 khi file không tồn tại", async () => {
    db.file.findUnique.mockResolvedValue(null);
    await expect(service.softDeleteFile("f1")).rejects.toMatchObject({ code: "FILE_NOT_FOUND" });
  });
});
