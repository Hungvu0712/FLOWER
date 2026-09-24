import type { Page } from '@playwright/test';
import { API_URL, expect, login, registerNewMember, test } from './fixtures';

// Giả lập access token hết hạn một cách TẤT ĐỊNH: xoá cookie access_token — đúng việc trình duyệt tự làm
// khi hết maxAge (backend đặt maxAge = đúng thời hạn JWT, xem cookie.util.ts), khỏi chờ 5 phút.
async function expireAccessToken(page: Page) {
  await page.context().clearCookies({ name: 'access_token' });
}

// Refresh token chết hẳn — giống người dùng bấm "Đăng xuất thiết bị" này từ một máy khác.
async function revokeCurrentSession(page: Page) {
  const res = await page.request.get(`${API_URL}/api/v1/account/sessions`);
  const sessions: { id: string; isCurrent: boolean }[] = (await res.json()).data;
  const current = sessions.find((s) => s.isCurrent)!;
  const revoke = await page.request.delete(`${API_URL}/api/v1/account/sessions/${current.id}`);
  expect(revoke.ok()).toBeTruthy();
}

// Cả 3 test đều điều hướng bằng BẤM LINK (điều hướng phía client) — tải lại trang cứng bằng
// page.goto() không tái hiện được các lỗi này (docs/12 FE-08: lần sửa đầu "không tái hiện được" vì vậy).
test.describe('Phiên đăng nhập hết hạn giữa chừng', () => {
  let member: { email: string; password: string };

  test.beforeEach(async ({ page }) => {
    member = await registerNewMember(page);
    await login(page, member.email, member.password);
    await page.goto('/account/profile');
    await expect(page.getByRole('banner').getByText('E2E Member')).toBeVisible();
  });

  test('refresh token đã bị thu hồi → về /login, header KHÔNG còn tên người dùng (docs/12 FE-09)', async ({
    page,
  }) => {
    await revokeCurrentSession(page);
    await expireAccessToken(page);

    await page.getByRole('link', { name: 'Thiết bị đăng nhập' }).click();

    await expect(page).toHaveURL(/\/login\?redirectTo=%2Faccount%2Fdevices/);
    const header = page.getByRole('banner');
    await expect(header.getByRole('link', { name: 'Đăng nhập' })).toBeVisible();
    await expect(header.getByText('E2E Member')).not.toBeVisible();
  });

  test('refresh token còn hạn → tự quay về ĐÚNG trang vừa bấm, không bật về trang chủ (docs/12 FE-08)', async ({
    page,
  }) => {
    await expireAccessToken(page);

    await page.getByRole('link', { name: 'Thiết bị đăng nhập' }).click();

    await expect(page).toHaveURL(/\/account\/devices$/);
    await expect(page.getByRole('banner').getByText('E2E Member')).toBeVisible();
  });

  test('bị đá về /login rồi đăng nhập lại → về đúng trang, không đứng im ở /login (docs/12 FE-08)', async ({
    page,
  }) => {
    await revokeCurrentSession(page);
    await expireAccessToken(page);
    await page.getByRole('link', { name: 'Thiết bị đăng nhập' }).click();
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Faccount%2Fdevices/);

    await page.getByLabel(/email/i).fill(member.email);
    await page.getByLabel(/mật khẩu/i).fill(member.password);
    // exact:true — xem giải thích ở fixtures.ts login()
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();

    await expect(page).toHaveURL(/\/account\/devices$/);
  });
});
