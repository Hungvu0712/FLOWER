import { API_URL, expect, login, registerNewMember, SUPER_ADMIN, test } from './fixtures';

test.describe('Đăng nhập / đăng xuất', () => {
  test('đăng nhập bằng email + mật khẩu, cookie được đặt httpOnly', async ({ page }) => {
    await login(page);

    const cookies = await page.context().cookies();
    const access = cookies.find((c) => c.name === 'access_token');
    const refresh = cookies.find((c) => c.name === 'refresh_token');

    expect(access, 'thiếu cookie access_token').toBeDefined();
    expect(access!.httpOnly).toBe(true);
    expect(refresh, 'thiếu cookie refresh_token').toBeDefined();
    expect(refresh!.httpOnly).toBe(true);
    expect(refresh!.path).toBe('/api/v1'); // phải đủ rộng để /account/sessions đọc được
  });

  test('sai mật khẩu → hiện lỗi, KHÔNG đăng nhập được', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(SUPER_ADMIN.email);
    await page.getByLabel(/mật khẩu/i).fill('mat-khau-sai-hoan-toan');
    // exact:true — xem giải thích ở fixtures.ts login()
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();

    await expect(page.getByText(/không đúng|không hợp lệ/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('đăng xuất xoá cookie và chặn lại khu vực cần đăng nhập', async ({ page }) => {
    await login(page);
    await page.goto('/account/profile');
    await expect(page).toHaveURL(/\/account\/profile/);

    await page.request.post(`${API_URL}/api/v1/auth/logout`);
    await page.goto('/account/profile');
    await expect(page).toHaveURL(/\/login/);
  });

  test('đăng ký tài khoản mới KHÔNG tự đăng nhập — phải tự đăng nhập lại', async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;

    await page.goto('/register');
    await page.getByLabel(/họ tên/i).fill('Người Dùng E2E');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/mật khẩu/i).fill('MatKhauE2E123');
    // Nút submit thật là "Tạo tài khoản" (register/page.tsx) — không phải "Đăng ký" như tên test gợi ý.
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click();

    await expect(page).toHaveURL(/\/login/);
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === 'access_token')).toBeUndefined();
  });

  test('validate phía client hiện lỗi ngay, không gửi request rác lên server', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel(/họ tên/i).fill('A');
    await page.getByLabel(/email/i).fill('khong-phai-email');
    await page.getByLabel(/mật khẩu/i).fill('123');
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click();

    await expect(page.getByText('Email không hợp lệ')).toBeVisible();
    await expect(page.getByText('Mật khẩu tối thiểu 8 ký tự')).toBeVisible();
  });
});

test.describe('Bảo vệ route', () => {
  const PROTECTED = ['/account/profile', '/account/devices', '/admin', '/superadmin/users'];

  for (const path of PROTECTED) {
    test(`chưa đăng nhập vào ${path} → chuyển tới /login kèm redirectTo`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?redirectTo=${encodeURIComponent(path)}`));
    });
  }

  test('đăng nhập xong quay lại đúng trang đã định vào', async ({ page }) => {
    await page.goto('/superadmin/users');
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel(/email/i).fill(SUPER_ADMIN.email);
    await page.getByLabel(/mật khẩu/i).fill(SUPER_ADMIN.password);
    // exact:true — xem giải thích ở fixtures.ts login()
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();

    await expect(page).toHaveURL(/\/superadmin\/users/);
  });

  test('member đăng nhập rồi vào /superadmin → bị đưa tới /403', async ({ page }) => {
    const member = await registerNewMember(page);
    await login(page, member.email, member.password);

    await page.goto('/superadmin/users');
    await expect(page).toHaveURL(/\/403/);
    // getByText khớp NHIỀU phần tử (h1 + p mô tả + div ẩn __next-route-announcer__ của Next.js đọc lại
    // tiêu đề trang cho screen reader) — thu hẹp về đúng heading (403/page.tsx).
    await expect(page.getByRole('heading', { name: /không có quyền truy cập/i })).toBeVisible();
  });

  test('API vẫn chặn độc lập với UI — member gọi thẳng API quản trị bị 403', async ({ page }) => {
    const member = await registerNewMember(page);
    await login(page, member.email, member.password);

    const res = await page.request.get(`${API_URL}/api/v1/superadmin/users`);
    expect(res.status()).toBe(403);
    expect((await res.json()).code).toBe('FORBIDDEN');
  });
});
