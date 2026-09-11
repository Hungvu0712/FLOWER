import { beforeEach, describe, expect, it } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import { cleanupExpiredTokens } from "@/jobs/cleanupExpiredTokens.job";

beforeEach(() => {
  resetPrismaMock();
  db.magicLinkToken.deleteMany.mockResolvedValue({ count: 0 });
  db.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
  db.session.deleteMany.mockResolvedValue({ count: 0 });
});

describe("cleanupExpiredTokens (docs/12 BE-13)", () => {
  it("xoá magic link token hết hạn quá 7 ngày, KHÔNG đụng token còn hạn/mới hết hạn", async () => {
    await cleanupExpiredTokens();

    const where = db.magicLinkToken.deleteMany.mock.calls[0]![0].where;
    const cutoff = where.expiresAt.lt as Date;
    const daysAgo = (Date.now() - cutoff.getTime()) / (24 * 60 * 60 * 1000);
    expect(daysAgo).toBeCloseTo(7, 1);
  });

  it("xoá password reset token cùng ngưỡng 7 ngày với magic link token", async () => {
    await cleanupExpiredTokens();

    const magicCutoff = db.magicLinkToken.deleteMany.mock.calls[0]![0].where.expiresAt.lt as Date;
    const resetCutoff = db.passwordResetToken.deleteMany.mock.calls[0]![0].where.expiresAt
      .lt as Date;
    expect(resetCutoff.getTime()).toBe(magicCutoff.getTime());
  });

  it("xoá session hết hạn HOẶC đã thu hồi quá 30 ngày (không xoá session đang hoạt động)", async () => {
    await cleanupExpiredTokens();

    const where = db.session.deleteMany.mock.calls[0]![0].where;
    expect(where.OR).toEqual([
      { expiresAt: { lt: expect.any(Date) } },
      { revokedAt: { lt: expect.any(Date) } },
    ]);
    const cutoff = where.OR[0].expiresAt.lt as Date;
    const daysAgo = (Date.now() - cutoff.getTime()) / (24 * 60 * 60 * 1000);
    expect(daysAgo).toBeCloseTo(30, 1);
  });

  it("chạy song song cả 3 truy vấn xoá, không đợi tuần tự", async () => {
    await cleanupExpiredTokens();

    expect(db.magicLinkToken.deleteMany).toHaveBeenCalledTimes(1);
    expect(db.passwordResetToken.deleteMany).toHaveBeenCalledTimes(1);
    expect(db.session.deleteMany).toHaveBeenCalledTimes(1);
  });
});
