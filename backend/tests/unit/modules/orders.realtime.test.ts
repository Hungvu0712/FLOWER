import { beforeEach, describe, expect, it } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import { signAccessToken } from "@/shared/utils/jwt";
import { resolveAdminAccess } from "@/modules/domain/orders/orders.realtime";

beforeEach(() => resetPrismaMock());

// Cùng cách mocking mà loginAs() ở tests/integration/helpers.ts dùng cho
// loadUserRolesAndPermissions() — mớm sẵn kết quả tra userRole.findMany.
function mockUserPermissions(permissions: string[]): void {
  db.userRole.findMany.mockResolvedValue([
    {
      role: { code: "admin", permissions: permissions.map((p) => ({ permission: { code: p } })) },
    },
  ]);
}

describe("resolveAdminAccess — join room 'admin:orders' lúc socket.io connection", () => {
  it("false khi không có cookie nào", async () => {
    expect(await resolveAdminAccess(undefined)).toBe(false);
  });

  it("false khi có cookie khác nhưng KHÔNG có access_token", async () => {
    expect(await resolveAdminAccess("theme=dark; lang=vi")).toBe(false);
  });

  it("false khi access_token giả mạo/hết hạn (verifyAccessToken throw)", async () => {
    expect(await resolveAdminAccess("access_token=token-gia-mao")).toBe(false);
  });

  it("false khi token hợp lệ nhưng KHÔNG có orders.view_all/orders.view_delivery_queue", async () => {
    const token = signAccessToken({ sub: "user-1" });
    mockUserPermissions(["categories.manage"]);
    expect(await resolveAdminAccess(`access_token=${token}`)).toBe(false);
  });

  it("true khi có orders.view_all", async () => {
    const token = signAccessToken({ sub: "admin-1" });
    mockUserPermissions(["orders.view_all"]);
    expect(await resolveAdminAccess(`access_token=${token}`)).toBe(true);
  });

  it("true khi có orders.view_delivery_queue (florist — không có orders.view_all)", async () => {
    const token = signAccessToken({ sub: "florist-1" });
    mockUserPermissions(["orders.view_delivery_queue"]);
    expect(await resolveAdminAccess(`access_token=${token}`)).toBe(true);
  });

  it("đọc đúng cookie access_token dù đứng giữa nhiều cookie khác", async () => {
    const token = signAccessToken({ sub: "admin-1" });
    mockUserPermissions(["orders.view_all"]);
    expect(await resolveAdminAccess(`theme=dark; access_token=${token}; lang=vi`)).toBe(true);
  });
});
