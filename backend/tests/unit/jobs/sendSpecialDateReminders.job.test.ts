import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import { emailService } from "@/modules/core/email/email.service";
import { sendSpecialDateReminders } from "@/jobs/sendSpecialDateReminders.job";

// "Hôm nay" cố định 2026-05-10 (UTC) — mọi test bên dưới tính lệch ngày từ mốc này để dễ suy luận.
const TODAY = "2026-05-10T00:00:00.000Z";

function specialDate(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "sd-1",
    date: new Date("2000-05-15T00:00:00.000Z"), // 15/5 — năm 2000 không mang ý nghĩa
    remindDaysBefore: 5, // 15/5 - 5 ngày = 10/5 = hôm nay
    lastRemindedYear: null,
    user: { id: "user-1", email: "user@example.com", fullName: "Nguyễn Văn A" },
    ...overrides,
  };
}

beforeEach(() => {
  resetPrismaMock();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(TODAY));
  vi.spyOn(emailService, "sendEmail").mockResolvedValue({ providerMessageId: "msg-1" });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("sendSpecialDateReminders", () => {
  it("gửi email khi (ngày dịp lễ sắp tới - remindDaysBefore) đúng bằng hôm nay", async () => {
    db.specialDate.findMany.mockResolvedValue([specialDate()]);
    db.specialDate.update.mockResolvedValue({});

    await sendSpecialDateReminders();

    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        type: "special_date_reminder",
      }),
    );
  });

  it("KHÔNG gửi khi chưa tới đúng ngày nhắc", async () => {
    // 15/5 - 5 ngày = 10/5, nhưng hôm nay mới 9/5 → chưa tới lượt nhắc.
    vi.setSystemTime(new Date("2026-05-09T00:00:00.000Z"));
    db.specialDate.findMany.mockResolvedValue([specialDate()]);

    await sendSpecialDateReminders();

    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  it("dịp lễ ĐÃ QUA trong năm nay → tính theo lượt SANG NĂM SAU, không gửi nhầm", async () => {
    // Hôm nay 10/5/2026, dịp lễ 1/1 đã qua từ lâu trong năm nay → lượt tới là 1/1/2027, còn rất xa,
    // remindDaysBefore=5 không thể khớp hôm nay.
    db.specialDate.findMany.mockResolvedValue([
      specialDate({ date: new Date("2000-01-01T00:00:00.000Z"), remindDaysBefore: 5 }),
    ]);

    await sendSpecialDateReminders();

    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  it("remindDaysBefore = 0 → nhắc ĐÚNG ngày diễn ra", async () => {
    db.specialDate.findMany.mockResolvedValue([
      specialDate({ date: new Date("2000-05-10T00:00:00.000Z"), remindDaysBefore: 0 }),
    ]);
    db.specialDate.update.mockResolvedValue({});

    await sendSpecialDateReminders();

    expect(emailService.sendEmail).toHaveBeenCalled();
  });

  it("ĐÃ nhắc năm nay rồi (lastRemindedYear trùng năm của lượt sắp tới) → không gửi lại", async () => {
    db.specialDate.findMany.mockResolvedValue([specialDate({ lastRemindedYear: 2026 })]);

    await sendSpecialDateReminders();

    expect(emailService.sendEmail).not.toHaveBeenCalled();
    expect(db.specialDate.update).not.toHaveBeenCalled();
  });

  it("gửi xong thì cập nhật lastRemindedYear = năm của lượt VỪA nhắc", async () => {
    db.specialDate.findMany.mockResolvedValue([specialDate()]);
    db.specialDate.update.mockResolvedValue({});

    await sendSpecialDateReminders();

    expect(db.specialDate.update).toHaveBeenCalledWith({
      where: { id: "sd-1" },
      data: { lastRemindedYear: 2026 },
    });
  });

  it("gửi email thất bại (best-effort) KHÔNG chặn cập nhật lastRemindedYear, không throw", async () => {
    vi.spyOn(emailService, "sendEmail").mockRejectedValue(new Error("SMTP chết"));
    db.specialDate.findMany.mockResolvedValue([specialDate()]);
    db.specialDate.update.mockResolvedValue({});

    await expect(sendSpecialDateReminders()).resolves.toBeUndefined();
    expect(db.specialDate.update).toHaveBeenCalled();
  });

  it("nhiều dịp cùng lúc — chỉ gửi đúng những dịp khớp ngày nhắc hôm nay", async () => {
    db.specialDate.findMany.mockResolvedValue([
      specialDate({ id: "sd-match", remindDaysBefore: 5 }), // khớp
      specialDate({ id: "sd-no-match", remindDaysBefore: 1 }), // 15/5 - 1 = 14/5, không khớp hôm nay
    ]);
    db.specialDate.update.mockResolvedValue({});

    await sendSpecialDateReminders();

    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    expect(db.specialDate.update).toHaveBeenCalledWith({
      where: { id: "sd-match" },
      data: { lastRemindedYear: 2026 },
    });
  });
});
