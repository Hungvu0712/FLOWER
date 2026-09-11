import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";

vi.mock("@/config/cloudinary", () => ({
  cloudinary: {
    utils: { api_sign_request: vi.fn().mockReturnValue("signed-abc") },
    api: { resource: vi.fn(), resources: vi.fn() },
    uploader: { destroy: vi.fn().mockResolvedValue({}), upload: vi.fn().mockResolvedValue({}) },
  },
}));

const { cloudinary } = await import("@/config/cloudinary");
const service = await import("@/modules/core/files/files.service");

beforeEach(() => {
  resetPrismaMock();
  vi.mocked(cloudinary.utils.api_sign_request).mockReturnValue("signed-abc");
});

describe("getUploadSignature", () => {
  const input = { originalName: "hoa-hong.jpg", mimeType: "image/jpeg", sizeBytes: 204800 };

  it("KHÔNG dùng tên file gốc làm publicId — sinh UUID để tránh trùng tên và path traversal", async () => {
    const result = await service.getUploadSignature(input as never);
    expect(result.publicId).not.toContain("hoa-hong");
    expect(result.publicId).toMatch(/^uploads\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}$/);
  });

  // Khác với S3 (ContentType/ContentLength nằm trong chữ ký, chặn được lúc upload), chữ ký Cloudinary
  // không có tham số ràng buộc kích thước — chỉ ràng buộc được ĐỊNH DẠNG qua allowed_formats. Kích
  // thước thật được kiểm chứng SAU khi upload, ở createFileRecord (xem describe bên dưới).
  it("ký (HMAC) đúng bộ tham số public_id/timestamp/allowed_formats", async () => {
    const result = await service.getUploadSignature(input as never);
    expect(cloudinary.utils.api_sign_request).toHaveBeenCalledWith(
      {
        public_id: result.publicId,
        timestamp: result.timestamp,
        allowed_formats: result.allowedFormats,
      },
      expect.any(String),
    );
    expect(result.signature).toBe("signed-abc");
  });

  it("giới hạn định dạng qua allowed_formats — khớp danh sách mime cho phép của module Files", async () => {
    const result = await service.getUploadSignature(input as never);
    expect(result.allowedFormats).toBe("jpg,jpeg,png,webp,gif,pdf");
  });

  it("trả uploadUrl đúng cloud_name, resourceType image (Cloudinary xem PDF là ảnh)", async () => {
    const result = await service.getUploadSignature(input as never);
    expect(result.uploadUrl).toBe("https://api.cloudinary.com/v1_1/test-cloud/image/upload");
  });
});

describe("createFileRecord", () => {
  it("tra publicId qua Admin API — lưu metadata THẬT Cloudinary trả về, không tin client khai", async () => {
    vi.mocked(cloudinary.api.resource).mockResolvedValue({
      bytes: 100,
      format: "jpg",
      secure_url: "https://res.cloudinary.com/test-cloud/image/upload/uploads/2026-09-09/x.jpg",
    } as never);
    db.file.create.mockResolvedValue({ id: "f1" });

    await service.createFileRecord(
      { publicId: "uploads/2026-09-09/x", originalName: "x.jpg" } as never,
      "user-1",
    );

    expect(cloudinary.api.resource).toHaveBeenCalledWith("uploads/2026-09-09/x", {
      resource_type: "image",
    });
    expect(db.file.create.mock.calls[0]![0].data).toMatchObject({
      cloudinaryPublicId: "uploads/2026-09-09/x",
      url: "https://res.cloudinary.com/test-cloud/image/upload/uploads/2026-09-09/x.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 100,
      uploadedBy: "user-1",
    });
  });

  it("404 khi publicId không tồn tại trên Cloudinary (client tự bịa publicId — đóng lỗ hổng BE-10)", async () => {
    vi.mocked(cloudinary.api.resource).mockRejectedValue(new Error("not found"));
    await expect(
      service.createFileRecord(
        { publicId: "uploads/bia-dat", originalName: "x.jpg" } as never,
        "user-1",
      ),
    ).rejects.toMatchObject({ statusCode: 404, code: "FILE_NOT_FOUND" });
    expect(db.file.create).not.toHaveBeenCalled();
  });

  it("vượt 10MB thì xoá luôn trên Cloudinary, không tạo bản ghi DB (chữ ký không chặn được lúc upload)", async () => {
    vi.mocked(cloudinary.api.resource).mockResolvedValue({
      bytes: 11 * 1024 * 1024,
      format: "jpg",
      secure_url: "https://res.cloudinary.com/test-cloud/image/upload/uploads/x.jpg",
    } as never);

    await expect(
      service.createFileRecord(
        { publicId: "uploads/qua-to", originalName: "x.jpg" } as never,
        "user-1",
      ),
    ).rejects.toMatchObject({ statusCode: 422, code: "FILE_TOO_LARGE" });

    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("uploads/qua-to", {
      resource_type: "image",
    });
    expect(db.file.create).not.toHaveBeenCalled();
  });
});

describe("listFiles", () => {
  it("loại trừ file đã xoá mềm", async () => {
    db.file.findMany.mockResolvedValue([]);
    db.file.count.mockResolvedValue(0);
    await service.listFiles({ page: 1, limit: 24 } as never);
    expect(db.file.findMany.mock.calls[0]![0].where).toMatchObject({ deletedAt: null });
  });

  it("bỏ trống folderId → chỉ file cấp gốc (folderId: null), khớp quy ước folders.service.ts", async () => {
    db.file.findMany.mockResolvedValue([]);
    db.file.count.mockResolvedValue(0);
    await service.listFiles({ page: 1, limit: 24 } as never);
    expect(db.file.findMany.mock.calls[0]![0].where).toMatchObject({ folderId: null });
  });

  it("có folderId → lọc đúng theo thư mục đó, không lẫn file thư mục khác", async () => {
    db.file.findMany.mockResolvedValue([]);
    db.file.count.mockResolvedValue(0);
    await service.listFiles({ folderId: "folder-1", page: 1, limit: 24 } as never);
    expect(db.file.findMany.mock.calls[0]![0].where).toMatchObject({ folderId: "folder-1" });
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
  it("chỉ đánh dấu deletedAt — object trên Cloudinary bị purge ở lượt cron sau (khoảng đệm an toàn)", async () => {
    db.file.findUnique.mockResolvedValue({ id: "f1", cloudinaryPublicId: "uploads/x" });
    db.file.update.mockResolvedValue({});
    await service.softDeleteFile("f1");
    expect(db.file.update).toHaveBeenCalledWith({
      where: { id: "f1" },
      data: { deletedAt: expect.any(Date) },
    });
    expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
  });

  it("404 khi file không tồn tại", async () => {
    db.file.findUnique.mockResolvedValue(null);
    await expect(service.softDeleteFile("f1")).rejects.toMatchObject({ code: "FILE_NOT_FOUND" });
  });
});

describe("purgeFileFromCloudinary", () => {
  it("gọi destroy đúng publicId + resourceType image", async () => {
    await service.purgeFileFromCloudinary("uploads/2026-09-09/x");
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("uploads/2026-09-09/x", {
      resource_type: "image",
    });
  });
});
