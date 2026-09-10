import { API_URL, expect, login, registerNewMember, test } from "./fixtures";

test.describe("Tài khoản — tự quản lý", () => {
  test("sửa họ tên và thấy thay đổi được lưu lại sau khi tải lại trang", async ({ page }) => {
    const member = await registerNewMember(page);
    await login(page, member.email, member.password);

    const newName = `Tên E2E ${Date.now()}`;
    await page.goto("/account/profile");
    const nameInput = page.getByLabel(/họ tên/i);
    await nameInput.fill(newName);
    await page.getByRole("button", { name: /lưu/i }).first().click();

    await expect(page.getByText(/đã lưu/i)).toBeVisible();
    await page.reload();
    await expect(page.getByLabel(/họ tên/i)).toHaveValue(newName);
  });

  test("đổi mật khẩu rồi đăng nhập lại bằng mật khẩu mới", async ({ page, browser }) => {
    const member = await registerNewMember(page);
    await login(page, member.email, member.password);
    const newPassword = "MatKhauMoiE2E456";

    const res = await page.request.post(`${API_URL}/api/v1/account/change-password`, {
      data: { currentPassword: member.password, newPassword },
    });
    expect(res.ok()).toBe(true);

    const context = await browser.newContext();
    const ok = await context.request.post(`${API_URL}/api/v1/auth/login`, {
      data: { email: member.email, password: newPassword },
    });
    expect(ok.ok()).toBe(true);

    const failed = await context.request.post(`${API_URL}/api/v1/auth/login`, {
      data: { email: member.email, password: member.password },
    });
    expect(failed.status()).toBe(401);
    await context.close();
  });

  test("trang thiết bị hiện phiên hiện tại có nhãn phân biệt", async ({ page }) => {
    const member = await registerNewMember(page);
    await login(page, member.email, member.password);

    await page.goto("/account/devices");
    await expect(page.getByText(/hiện tại/i).first()).toBeVisible();
  });

  test("đăng xuất thiết bị khác KHÔNG làm mất phiên đang dùng", async ({ page, browser }) => {
    const member = await registerNewMember(page);

    // Tạo phiên thứ hai ở trình duyệt khác.
    const other = await browser.newContext();
    await other.request.post(`${API_URL}/api/v1/auth/login`, {
      data: { email: member.email, password: member.password },
    });

    await login(page, member.email, member.password);
    const before = await (await page.request.get(`${API_URL}/api/v1/account/sessions`)).json();
    expect(before.data.length).toBeGreaterThanOrEqual(2);

    expect((await page.request.delete(`${API_URL}/api/v1/account/sessions`)).ok()).toBe(true);

    // Phiên hiện tại vẫn dùng được — đây là bug đã từng xảy ra khi cookie refresh_token
    // để path quá hẹp khiến backend không nhận ra phiên nào là "hiện tại".
    const after = await page.request.get(`${API_URL}/api/v1/account/sessions`);
    expect(after.ok()).toBe(true);
    expect((await after.json()).data).toHaveLength(1);

    await other.close();
  });

  test("KHÔNG thu hồi được phiên của người khác (chống IDOR)", async ({ page, browser }) => {
    const victim = await registerNewMember(page);
    const victimContext = await browser.newContext();
    await victimContext.request.post(`${API_URL}/api/v1/auth/login`, {
      data: { email: victim.email, password: victim.password },
    });
    const victimSessions = await (
      await victimContext.request.get(`${API_URL}/api/v1/account/sessions`)
    ).json();
    const victimSessionId = victimSessions.data[0].id;

    const attacker = await registerNewMember(page);
    await login(page, attacker.email, attacker.password);

    const res = await page.request.delete(`${API_URL}/api/v1/account/sessions/${victimSessionId}`);
    expect(res.status()).toBe(404);

    // Phiên của nạn nhân vẫn còn nguyên.
    const still = await (await victimContext.request.get(`${API_URL}/api/v1/account/sessions`)).json();
    expect(still.data).toHaveLength(1);
    await victimContext.close();
  });
});
