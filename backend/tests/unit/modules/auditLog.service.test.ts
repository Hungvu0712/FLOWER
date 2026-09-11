import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import * as service from "@/modules/core/audit-log/auditLog.service";
import { logger } from "@/shared/logger/logger";

beforeEach(() => resetPrismaMock());

describe("record — best effort", () => {
  it("ghi đầy đủ actor/action/entity/before/after/ip", async () => {
    db.auditLog.create.mockResolvedValue({});
    await service.record({
      actorId: "u1",
      action: "user.block",
      entityType: "user",
      entityId: "u2",
      before: { status: "active" },
      after: { status: "blocked" },
      ipAddress: "1.2.3.4",
    });
    expect(db.auditLog.create.mock.calls[0]![0].data).toMatchObject({
      actorId: "u1",
      action: "user.block",
      entityType: "user",
      entityId: "u2",
      before: { status: "active" },
      after: { status: "blocked" },
      ipAddress: "1.2.3.4",
    });
  });

  it("ép entityId về chuỗi (role/permission dùng id số)", async () => {
    db.auditLog.create.mockResolvedValue({});
    await service.record({ action: "role.create", entityType: "role", entityId: 42 });
    expect(db.auditLog.create.mock.calls[0]![0].data.entityId).toBe("42");
  });

  it("LỖI GHI LOG KHÔNG được làm hỏng nghiệp vụ chính", async () => {
    db.auditLog.create.mockRejectedValue(new Error("DB sập"));
    // docs/12 BE-18: logger đổi sang pino, không còn gọi console.error trực tiếp — spy thẳng logger.error.
    const spy = vi.spyOn(logger, "error").mockImplementation(() => {});
    await expect(
      service.record({ action: "x", entityType: "y", entityId: "z" }),
    ).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
  });

  it("bỏ qua trường không truyền thay vì ghi undefined", async () => {
    db.auditLog.create.mockResolvedValue({});
    await service.record({ action: "x", entityType: "y", entityId: "z" });
    const data = db.auditLog.create.mock.calls[0]![0].data;
    expect(data).not.toHaveProperty("actorId");
    expect(data).not.toHaveProperty("before");
    expect(data).not.toHaveProperty("ipAddress");
  });
});

describe("list", () => {
  it("lọc theo actor, entityType và khoảng thời gian", async () => {
    db.auditLog.findMany.mockResolvedValue([]);
    db.auditLog.count.mockResolvedValue(0);
    await service.list({
      actorId: "u1",
      entityType: "user",
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-09-30T00:00:00.000Z",
      page: 1,
      limit: 20,
    });
    expect(db.auditLog.findMany.mock.calls[0]![0].where).toEqual({
      actorId: "u1",
      entityType: "user",
      createdAt: {
        gte: new Date("2026-09-01T00:00:00.000Z"),
        lte: new Date("2026-09-30T00:00:00.000Z"),
      },
    });
  });

  it("không truyền filter → where rỗng", async () => {
    db.auditLog.findMany.mockResolvedValue([]);
    db.auditLog.count.mockResolvedValue(0);
    await service.list({ page: 1, limit: 20 });
    expect(db.auditLog.findMany.mock.calls[0]![0].where).toEqual({});
  });

  it("sắp xếp mới nhất trước và kèm thông tin người thực hiện", async () => {
    db.auditLog.findMany.mockResolvedValue([]);
    db.auditLog.count.mockResolvedValue(0);
    await service.list({ page: 1, limit: 20 });
    const call = db.auditLog.findMany.mock.calls[0]![0];
    expect(call.orderBy).toEqual({ createdAt: "desc" });
    expect(call.include.actor.select).toEqual({ id: true, fullName: true, email: true });
  });

  it("trả meta phân trang đúng", async () => {
    db.auditLog.findMany.mockResolvedValue([]);
    db.auditLog.count.mockResolvedValue(45);
    const { meta } = await service.list({ page: 2, limit: 20 });
    expect(meta).toEqual({ page: 2, limit: 20, total: 45, totalPages: 3 });
  });
});
