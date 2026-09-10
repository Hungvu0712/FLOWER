import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/axios", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const { api } = await import("@/lib/axios");
const { authService } = await import("@/features/core/auth/auth.service");
const { accountService } = await import("@/features/core/account/account.service");
const { categoriesService } = await import("@/features/domain/categories/categories.service");
const { adminUsersService } = await import("@/features/core/admin-users/adminUsers.service");

// `api.get/post/...` là hàm generic có nhiều overload nên `vi.mocked()` không suy ra được kiểu mock —
// ép kiểu tường minh sang Mock để dùng `.mockReturnValue()` / `.mock.calls`.
const mocked = api as unknown as Record<"get" | "post" | "patch" | "delete", Mock>;

beforeEach(() => {
  mocked.get.mockReset();
  mocked.post.mockReset();
  mocked.patch.mockReset();
  mocked.delete.mockReset();
});

// Backend luôn trả envelope { success, message, data } — service phải bóc đúng `data` để
// component/hook không phải biết về envelope. Xem docs/03-backend.md §4.
function envelope<T>(data: T) {
  return Promise.resolve({ data: { success: true, message: "Success", data } });
}

describe("authService", () => {
  it("mọi endpoint đều gọi đúng đường dẫn có prefix /api/v1", async () => {
    mocked.get.mockReturnValue(envelope([]) as never);
    mocked.post.mockReturnValue(envelope({ user: { id: "u1" } }) as never);

    await authService.getLoginMethods();
    await authService.login({ email: "a@x.com", password: "p" } as never);
    await authService.register({ fullName: "A", email: "a@x.com", password: "12345678" } as never);
    await authService.logout();

    expect(mocked.get.mock.calls[0]![0]).toBe("/api/v1/auth/login-methods");
    expect(mocked.post.mock.calls.map((c: unknown[]) => c[0])).toEqual([
      "/api/v1/auth/login",
      "/api/v1/auth/register",
      "/api/v1/auth/logout",
    ]);
  });

  it("bóc đúng lớp data lồng nhau của envelope", async () => {
    mocked.post.mockReturnValue(envelope({ user: { id: "u1", email: "a@x.com" } }) as never);
    expect(await authService.login({ email: "a@x.com", password: "p" } as never)).toEqual({
      user: { id: "u1", email: "a@x.com" },
    });
  });

  it("resetPassword gộp token vào body cùng mật khẩu mới", async () => {
    mocked.post.mockReturnValue(envelope(null) as never);
    await authService.resetPassword("token-abc", { newPassword: "matkhaumoi" } as never);
    expect(mocked.post).toHaveBeenCalledWith("/api/v1/auth/reset-password", {
      token: "token-abc",
      newPassword: "matkhaumoi",
    });
  });

  it("KHÔNG tự gắn Authorization header (token nằm ở cookie httpOnly)", async () => {
    mocked.post.mockReturnValue(envelope({ user: {} }) as never);
    await authService.login({ email: "a@x.com", password: "p" } as never);
    expect(JSON.stringify(mocked.post.mock.calls)).not.toContain("Authorization");
  });
});

describe("accountService", () => {
  it("getMe trả thẳng object user (đã bóc envelope)", async () => {
    mocked.get.mockReturnValue(envelope({ id: "u1", roles: ["member"], permissions: [] }) as never);
    expect(await accountService.getMe()).toMatchObject({ id: "u1", roles: ["member"] });
  });

  it("revokeSession gọi DELETE đúng id", async () => {
    mocked.delete.mockReturnValue(envelope(null) as never);
    await accountService.revokeSession("sess-9");
    expect(mocked.delete).toHaveBeenCalledWith("/api/v1/account/sessions/sess-9");
  });

  it("revokeOtherSessions gọi DELETE không kèm id (endpoint tập thể)", async () => {
    mocked.delete.mockReturnValue(envelope(null) as never);
    await accountService.revokeOtherSessions();
    expect(mocked.delete).toHaveBeenCalledWith("/api/v1/account/sessions");
  });
});

describe("categoriesService", () => {
  it("list gọi endpoint ADMIN (không phải endpoint công khai) và truyền params", async () => {
    mocked.get.mockReturnValue(envelope([]) as never);
    await categoriesService.list({ includeInactive: true });
    expect(mocked.get).toHaveBeenCalledWith("/api/v1/admin/categories", {
      params: { includeInactive: true },
    });
  });

  it("update gọi PATCH theo id", async () => {
    mocked.patch.mockReturnValue(envelope({}) as never);
    await categoriesService.update("cat-1", { name: "Tên mới" });
    expect(mocked.patch).toHaveBeenCalledWith("/api/v1/admin/categories/cat-1", { name: "Tên mới" });
  });

  it("remove gọi DELETE theo id", async () => {
    mocked.delete.mockReturnValue(envelope(null) as never);
    await categoriesService.remove("cat-1");
    expect(mocked.delete).toHaveBeenCalledWith("/api/v1/admin/categories/cat-1");
  });
});

describe("adminUsersService", () => {
  it("gọi đúng nhánh /superadmin/users (khác /admin — quản trị hệ thống)", async () => {
    mocked.get.mockReturnValue(
      Promise.resolve({ data: { success: true, data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } } }) as never,
    );
    await adminUsersService.list({ page: 1, limit: 20 } as never);
    expect(mocked.get.mock.calls[0]![0]).toContain("/api/v1/superadmin/users");
  });
});
