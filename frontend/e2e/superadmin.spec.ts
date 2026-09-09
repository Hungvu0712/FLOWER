import { API_URL, expect, login, registerNewMember, test } from "./fixtures";

test.describe("SuperAdmin — quản lý người dùng", () => {
  test.beforeEach(async ({ page }) => login(page));

  test("xem được danh sách người dùng có phân trang", async ({ page }) => {
    await page.goto("/superadmin/users");
    await expect(page.getByRole("table").or(page.getByRole("list")).first()).toBeVisible();
    await expect(page.getByText(/superadmin@|@/).first()).toBeVisible();
  });

  test("KHÔNG thể tự khoá chính mình (chặn ở backend, không chỉ ở UI)", async ({ page }) => {
    const me = await (await page.request.get(`${API_URL}/api/v1/account/me`)).json();

    const res = await page.request.patch(`${API_URL}/api/v1/superadmin/users/${me.data.id}/block`);
    expect(res.status()).toBe(400);
    expect((await res.json()).code).toBe("CANNOT_TARGET_SELF");
  });

  test("KHÔNG thể tự xoá chính mình", async ({ page }) => {
    const me = await (await page.request.get(`${API_URL}/api/v1/account/me`)).json();
    const res = await page.request.delete(`${API_URL}/api/v1/superadmin/users/${me.data.id}`);
    expect(res.status()).toBe(400);
  });

  test("KHÔNG thể gán quyền super_admin cho người khác", async ({ page }) => {
    const member = await registerNewMember(page);
    const list = await (
      await page.request.get(`${API_URL}/api/v1/superadmin/users?search=${member.email}`)
    ).json();
    const target = list.data[0];
    expect(target, "không tìm thấy tài khoản vừa tạo").toBeTruthy();

    const res = await page.request.patch(`${API_URL}/api/v1/superadmin/users/${target.id}/role`, {
      data: { roleCode: "super_admin" },
    });
    expect(res.status()).toBe(403);
    expect((await res.json()).code).toBe("CANNOT_GRANT_SUPER_ADMIN");
  });

  test("khoá rồi mở khoá được tài khoản khác", async ({ page }) => {
    const member = await registerNewMember(page);
    const list = await (
      await page.request.get(`${API_URL}/api/v1/superadmin/users?search=${member.email}`)
    ).json();
    const target = list.data[0];

    expect((await page.request.patch(`${API_URL}/api/v1/superadmin/users/${target.id}/block`)).ok()).toBe(true);
    expect((await page.request.patch(`${API_URL}/api/v1/superadmin/users/${target.id}/unblock`)).ok()).toBe(true);
  });

  test("tài khoản bị khoá không đăng nhập được nữa", async ({ page, browser }) => {
    const member = await registerNewMember(page);
    const list = await (
      await page.request.get(`${API_URL}/api/v1/superadmin/users?search=${member.email}`)
    ).json();
    await page.request.patch(`${API_URL}/api/v1/superadmin/users/${list.data[0].id}/block`);

    const context = await browser.newContext();
    const res = await context.request.post(`${API_URL}/api/v1/auth/login`, {
      data: { email: member.email, password: member.password },
    });
    expect(res.status()).toBe(403);
    expect((await res.json()).code).toBe("ACCOUNT_BLOCKED");
    await context.close();
  });
});

test.describe("SuperAdmin — role & permission", () => {
  test.beforeEach(async ({ page }) => login(page));

  test("tạo Custom Role kèm permission is_restricted → permission đó bị LỌC BỎ", async ({ page }) => {
    const restricted = await (
      await page.request.get(`${API_URL}/api/v1/superadmin/permissions`)
    ).json();
    const usersManage = restricted.data.find((p: { code: string }) => p.code === "users.manage");
    expect(usersManage, "seed:core chưa chạy?").toBeTruthy();

    const code = `e2e_role_${Date.now()}`;
    const created = await page.request.post(`${API_URL}/api/v1/superadmin/roles`, {
      data: { code, name: "Role E2E", permissionIds: [usersManage.id] },
    });
    expect(created.ok()).toBe(true);

    const roles = await (await page.request.get(`${API_URL}/api/v1/superadmin/roles`)).json();
    const role = roles.data.find((r: { code: string }) => r.code === code);
    const granted = role.permissions.map((rp: { permission: { code: string } }) => rp.permission.code);
    expect(granted).not.toContain("users.manage");

    await page.request.delete(`${API_URL}/api/v1/superadmin/roles/${role.id}`);
  });

  test("KHÔNG sửa/xoá được System Role", async ({ page }) => {
    const roles = await (await page.request.get(`${API_URL}/api/v1/superadmin/roles`)).json();
    const systemRole = roles.data.find((r: { isSystem: boolean }) => r.isSystem);

    const patched = await page.request.patch(`${API_URL}/api/v1/superadmin/roles/${systemRole.id}`, {
      data: { name: "Đổi tên trái phép" },
    });
    expect(patched.status()).toBe(403);
    expect((await page.request.delete(`${API_URL}/api/v1/superadmin/roles/${systemRole.id}`)).status()).toBe(403);
  });

  test("KHÔNG đổi được code của permission hệ thống", async ({ page }) => {
    const permissions = await (await page.request.get(`${API_URL}/api/v1/superadmin/permissions`)).json();
    const systemPermission = permissions.data.find((p: { isSystem: boolean }) => p.isSystem);

    const res = await page.request.patch(`${API_URL}/api/v1/superadmin/permissions/${systemPermission.id}`, {
      data: { code: "bi.doi_code" },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe("SuperAdmin — phương thức đăng nhập", () => {
  test.beforeEach(async ({ page }) => login(page));

  test("KHÔNG tắt được phương thức đăng nhập cuối cùng", async ({ page }) => {
    const before = await (await page.request.get(`${API_URL}/api/v1/superadmin/login-methods`)).json();
    const enabled = before.data.filter((m: { isEnabled: boolean }) => m.isEnabled);

    // Tắt dần, chừa lại phương thức cuối để thử tắt nốt.
    for (const method of enabled.slice(0, -1)) {
      await page.request.patch(`${API_URL}/api/v1/superadmin/login-methods/${method.method}`, {
        data: { isEnabled: false },
      });
    }
    const last = enabled[enabled.length - 1];
    const res = await page.request.patch(`${API_URL}/api/v1/superadmin/login-methods/${last.method}`, {
      data: { isEnabled: false },
    });

    expect(res.status()).toBe(400);
    expect((await res.json()).code).toBe("AT_LEAST_ONE_LOGIN_METHOD_REQUIRED");

    // Khôi phục trạng thái ban đầu để không ảnh hưởng các test sau.
    for (const method of enabled) {
      await page.request.patch(`${API_URL}/api/v1/superadmin/login-methods/${method.method}`, {
        data: { isEnabled: true },
      });
    }
  });
});
