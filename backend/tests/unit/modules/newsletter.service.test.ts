import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import * as auditLog from "@/modules/core/audit-log/auditLog.service";
import * as service from "@/modules/domain/newsletter/newsletter.service";

const ACTOR = "admin-1";

beforeEach(() => {
  resetPrismaMock();
  vi.spyOn(auditLog, "record").mockResolvedValue(undefined);
});

describe("subscribe", () => {
  it("chuẩn hoá email về chữ thường + trim trước khi tra/ghi DB", async () => {
    db.newsletterSubscriber.findUnique.mockResolvedValue(null);
    db.newsletterSubscriber.create.mockResolvedValue({});
    await service.subscribe("  A@Example.com  ");
    expect(db.newsletterSubscriber.findUnique).toHaveBeenCalledWith({
      where: { email: "a@example.com" },
    });
    expect(db.newsletterSubscriber.create.mock.calls[0]![0].data.email).toBe("a@example.com");
  });

  it("email mới → tạo dòng mới isActive mặc định true", async () => {
    db.newsletterSubscriber.findUnique.mockResolvedValue(null);
    db.newsletterSubscriber.create.mockResolvedValue({});
    await service.subscribe("moi@example.com");
    expect(db.newsletterSubscriber.create).toHaveBeenCalledWith({
      data: { email: "moi@example.com" },
    });
  });

  it("email đã đăng ký VÀ đang active → idempotent, KHÔNG update/create thêm", async () => {
    db.newsletterSubscriber.findUnique.mockResolvedValue({ id: "s1", isActive: true });
    await service.subscribe("da-dang-ky@example.com");
    expect(db.newsletterSubscriber.create).not.toHaveBeenCalled();
    expect(db.newsletterSubscriber.update).not.toHaveBeenCalled();
  });

  it("email đã unsubscribe trước đó → resubscribe (bật lại isActive, xoá unsubscribedAt)", async () => {
    db.newsletterSubscriber.findUnique.mockResolvedValue({ id: "s1", isActive: false });
    db.newsletterSubscriber.update.mockResolvedValue({});
    await service.subscribe("roi-di-roi-quay-lai@example.com");
    expect(db.newsletterSubscriber.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { isActive: true, subscribedAt: expect.any(Date), unsubscribedAt: null },
    });
  });
});

describe("unsubscribe", () => {
  it("email đang active → chuyển isActive: false + ghi unsubscribedAt", async () => {
    db.newsletterSubscriber.findUnique.mockResolvedValue({ id: "s1", isActive: true });
    db.newsletterSubscriber.update.mockResolvedValue({});
    await service.unsubscribe("dang-ky@example.com");
    expect(db.newsletterSubscriber.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { isActive: false, unsubscribedAt: expect.any(Date) },
    });
  });

  it("email không tồn tại → không làm gì, KHÔNG throw (chống dò email qua lỗi)", async () => {
    db.newsletterSubscriber.findUnique.mockResolvedValue(null);
    await expect(service.unsubscribe("khong-ton-tai@example.com")).resolves.toBeUndefined();
    expect(db.newsletterSubscriber.update).not.toHaveBeenCalled();
  });

  it("email đã unsubscribe từ trước → idempotent, không update lại", async () => {
    db.newsletterSubscriber.findUnique.mockResolvedValue({ id: "s1", isActive: false });
    await service.unsubscribe("da-huy@example.com");
    expect(db.newsletterSubscriber.update).not.toHaveBeenCalled();
  });
});

describe("listAdmin", () => {
  it("mặc định không lọc isActive (lấy cả active + đã hủy)", async () => {
    db.newsletterSubscriber.findMany.mockResolvedValue([]);
    db.newsletterSubscriber.count.mockResolvedValue(0);
    await service.listAdmin({ page: 1, limit: 24 } as never);
    expect(db.newsletterSubscriber.findMany.mock.calls[0]![0].where).toEqual({});
  });

  it("lọc isActive khi có truyền", async () => {
    db.newsletterSubscriber.findMany.mockResolvedValue([]);
    db.newsletterSubscriber.count.mockResolvedValue(0);
    await service.listAdmin({ isActive: true, page: 1, limit: 24 } as never);
    expect(db.newsletterSubscriber.findMany.mock.calls[0]![0].where).toEqual({ isActive: true });
  });
});

describe("remove", () => {
  it("404 khi không tìm thấy người đăng ký", async () => {
    db.newsletterSubscriber.findUnique.mockResolvedValue(null);
    await expect(service.remove(ACTOR, "khong-co")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("xoá THẬT khỏi DB và ghi audit log", async () => {
    db.newsletterSubscriber.findUnique.mockResolvedValue({ id: "s1", email: "x@example.com" });
    db.newsletterSubscriber.delete.mockResolvedValue({});
    await service.remove(ACTOR, "s1");
    expect(db.newsletterSubscriber.delete).toHaveBeenCalledWith({ where: { id: "s1" } });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "newsletter_subscriber.delete",
        entityType: "newsletter_subscriber",
      }),
    );
  });
});
