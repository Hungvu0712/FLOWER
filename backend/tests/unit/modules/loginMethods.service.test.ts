import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import * as auditLog from "@/modules/core/audit-log/auditLog.service";
import * as service from "@/modules/core/settings/loginMethods.service";

const ACTOR = "superadmin-1";

const all = (google: boolean, email: boolean, magic: boolean) => [
  { method: "google_oauth", isEnabled: google },
  { method: "email_password", isEnabled: email },
  { method: "magic_link", isEnabled: magic },
];

beforeEach(() => {
  resetPrismaMock();
  vi.spyOn(auditLog, "record").mockResolvedValue(undefined);
});

describe("update — luôn phải còn ≥ 1 phương thức đăng nhập", () => {
  it("CHẶN tắt phương thức cuối cùng (nếu không, cả hệ thống bị khoá cứng)", async () => {
    db.loginMethodSetting.findMany.mockResolvedValue(all(false, true, false));

    await expect(service.update(ACTOR, "email_password", false)).rejects.toMatchObject({
      statusCode: 400,
      code: "AT_LEAST_ONE_LOGIN_METHOD_REQUIRED",
    });
    expect(db.loginMethodSetting.update).not.toHaveBeenCalled();
  });

  it("cho tắt khi vẫn còn phương thức khác đang bật", async () => {
    db.loginMethodSetting.findMany.mockResolvedValue(all(true, true, false));
    db.loginMethodSetting.update.mockResolvedValue({ method: "email_password", isEnabled: false });

    await service.update(ACTOR, "email_password", false);

    expect(db.loginMethodSetting.update).toHaveBeenCalledWith({
      where: { method: "email_password" },
      data: { isEnabled: false, updatedBy: ACTOR },
    });
  });

  it("bật lại phương thức luôn được phép (không bao giờ giảm số phương thức bật)", async () => {
    db.loginMethodSetting.findMany.mockResolvedValue(all(false, true, false));
    db.loginMethodSetting.update.mockResolvedValue({});
    await expect(service.update(ACTOR, "google_oauth", true)).resolves.toBeDefined();
  });

  it("tính số phương thức còn bật SAU khi áp thay đổi, không phải trước", async () => {
    // Hiện đang bật 2; tắt 1 → còn 1 → hợp lệ.
    db.loginMethodSetting.findMany.mockResolvedValue(all(true, true, false));
    db.loginMethodSetting.update.mockResolvedValue({});
    await expect(service.update(ACTOR, "google_oauth", false)).resolves.toBeDefined();
  });

  it("404 khi phương thức không tồn tại", async () => {
    db.loginMethodSetting.findMany.mockResolvedValue(all(true, true, true));
    await expect(service.update(ACTOR, "facebook", false)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("ghi audit log kèm trạng thái trước/sau", async () => {
    db.loginMethodSetting.findMany.mockResolvedValue(all(true, true, true));
    db.loginMethodSetting.update.mockResolvedValue({});

    await service.update(ACTOR, "magic_link", false, "1.2.3.4");

    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "login_method.toggle",
        entityId: "magic_link",
        before: { isEnabled: true },
        after: { isEnabled: false },
        ipAddress: "1.2.3.4",
      }),
    );
  });
});
