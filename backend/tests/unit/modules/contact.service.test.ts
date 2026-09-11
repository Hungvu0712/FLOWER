import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import { emailService } from "@/modules/core/email/email.service";
import * as auditLog from "@/modules/core/audit-log/auditLog.service";
import * as service from "@/modules/core/contact/contact.service";

beforeEach(() => {
  resetPrismaMock();
  vi.spyOn(emailService, "sendEmail").mockResolvedValue({ providerMessageId: "msg-1" } as never);
  vi.spyOn(auditLog, "record").mockResolvedValue(undefined);
});

describe("create", () => {
  it("lưu vào DB TRƯỚC, không phụ thuộc email gửi thành công", async () => {
    db.contactMessage.create.mockResolvedValue({ id: "c1" });
    await service.create({
      name: "An",
      phone: "0900000000",
      message: "Cho hỏi giá hoa cưới",
    } as never);
    expect(db.contactMessage.create).toHaveBeenCalledWith({
      data: { name: "An", phone: "0900000000", email: null, message: "Cho hỏi giá hoa cưới" },
    });
  });

  it("email rỗng ('') chuyển thành null, không lưu chuỗi rỗng", async () => {
    db.contactMessage.create.mockResolvedValue({ id: "c1" });
    await service.create({
      name: "An",
      phone: "0900000000",
      email: "",
      message: "Hỏi giá",
    } as never);
    expect(db.contactMessage.create.mock.calls[0]![0].data.email).toBeNull();
  });

  it("gửi email thông báo, escape HTML trong nội dung khách nhập (chống XSS trong email)", async () => {
    db.contactMessage.create.mockResolvedValue({ id: "c1" });
    await service.create({
      name: "<script>alert(1)</script>",
      phone: "0900000000",
      message: "Xin chào",
    } as never);

    const call = vi.mocked(emailService.sendEmail).mock.calls[0]![0];
    expect(call.html).not.toContain("<script>");
    expect(call.html).toContain("&lt;script&gt;");
    expect(call.type).toBe("contact_message");
  });

  it("lỗi gửi email KHÔNG làm hỏng request (đã lưu DB xong) — giống luồng magic link/reset password", async () => {
    db.contactMessage.create.mockResolvedValue({ id: "c1" });
    vi.mocked(emailService.sendEmail).mockRejectedValue(new Error("SMTP down"));
    await expect(
      service.create({ name: "An", phone: "0900000000", message: "Hỏi giá" } as never),
    ).resolves.toMatchObject({ id: "c1" });
  });
});

describe("list", () => {
  it("không lọc isHandled khi không truyền", async () => {
    db.contactMessage.findMany.mockResolvedValue([]);
    db.contactMessage.count.mockResolvedValue(0);
    await service.list({ page: 1, limit: 24 } as never);
    expect(db.contactMessage.findMany.mock.calls[0]![0].where).toEqual({});
  });

  it("lọc theo isHandled khi có truyền", async () => {
    db.contactMessage.findMany.mockResolvedValue([]);
    db.contactMessage.count.mockResolvedValue(0);
    await service.list({ page: 1, limit: 24, isHandled: false } as never);
    expect(db.contactMessage.findMany.mock.calls[0]![0].where).toEqual({ isHandled: false });
  });
});

describe("update — đánh dấu đã xử lý", () => {
  it("404 khi tin nhắn không tồn tại", async () => {
    db.contactMessage.findUnique.mockResolvedValue(null);
    await expect(
      service.update("admin-1", "c1", { isHandled: true } as never),
    ).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
  });

  it("cập nhật thành công và ghi audit log", async () => {
    db.contactMessage.findUnique.mockResolvedValue({ id: "c1", isHandled: false });
    db.contactMessage.update.mockResolvedValue({ id: "c1", isHandled: true });
    await service.update("admin-1", "c1", { isHandled: true } as never, "1.2.3.4");
    expect(db.contactMessage.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { isHandled: true },
    });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "contact_message.mark_handled", ipAddress: "1.2.3.4" }),
    );
  });
});
