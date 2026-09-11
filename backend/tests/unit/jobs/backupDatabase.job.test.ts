import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config/cloudinary", () => ({
  cloudinary: {
    api: { resources: vi.fn() },
    uploader: { destroy: vi.fn().mockResolvedValue({}), upload: vi.fn().mockResolvedValue({}) },
  },
}));

const { cloudinary } = await import("@/config/cloudinary");
const { cleanupOldBackups } = await import("@/jobs/backupDatabase.job");

function resource(publicId: string, daysAgo: number) {
  return {
    public_id: publicId,
    created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
  };
}

beforeEach(() => {
  vi.mocked(cloudinary.api.resources).mockReset();
  vi.mocked(cloudinary.uploader.destroy).mockClear();
});

describe("cleanupOldBackups — phân trang qua next_cursor (docs/12 OPS-03)", () => {
  it("chỉ 1 trang (không có next_cursor) → gọi resources đúng 1 lần", async () => {
    vi.mocked(cloudinary.api.resources).mockResolvedValue({
      resources: [resource("backups/a", 40)],
    } as never);

    await cleanupOldBackups();

    expect(cloudinary.api.resources).toHaveBeenCalledTimes(1);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("backups/a", { resource_type: "raw" });
  });

  it("nhiều hơn 1 trang (có next_cursor) → lặp cho tới khi hết trang, không bỏ sót object trang sau", async () => {
    vi.mocked(cloudinary.api.resources)
      .mockResolvedValueOnce({
        resources: [resource("backups/trang-1", 40)],
        next_cursor: "cursor-abc",
      } as never)
      .mockResolvedValueOnce({
        resources: [resource("backups/trang-2", 40)],
      } as never);

    await cleanupOldBackups();

    expect(cloudinary.api.resources).toHaveBeenCalledTimes(2);
    // Lần gọi thứ 2 PHẢI truyền lại đúng next_cursor nhận được từ lần gọi trước.
    expect(cloudinary.api.resources).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ next_cursor: "cursor-abc" }),
    );
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("backups/trang-1", {
      resource_type: "raw",
    });
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("backups/trang-2", {
      resource_type: "raw",
    });
  });

  it("chỉ xoá backup quá 30 ngày, GIỮ LẠI backup còn mới trên cả nhiều trang", async () => {
    vi.mocked(cloudinary.api.resources)
      .mockResolvedValueOnce({
        resources: [resource("backups/cu", 40)],
        next_cursor: "cursor-abc",
      } as never)
      .mockResolvedValueOnce({
        resources: [resource("backups/moi", 5)],
      } as never);

    await cleanupOldBackups();

    expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(1);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("backups/cu", {
      resource_type: "raw",
    });
  });
});
