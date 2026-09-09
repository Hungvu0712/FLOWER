import { expect, test as base, type Page } from "@playwright/test";

// Tài khoản do `npm run seed:core` tạo ra (backend/prisma/seed/core.seed.ts).
// Ghi đè bằng biến môi trường nếu môi trường test dùng tài khoản khác.
export const SUPER_ADMIN = {
  email: process.env.E2E_SUPER_ADMIN_EMAIL ?? "superadmin@example.com",
  password: process.env.E2E_SUPER_ADMIN_PASSWORD ?? "ChangeMe123!",
};

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:4000";

export async function login(page: Page, email = SUPER_ADMIN.email, password = SUPER_ADMIN.password) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/mật khẩu/i).fill(password);
  await page.getByRole("button", { name: /đăng nhập/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export async function logout(page: Page) {
  await page.request.post(`${API_URL}/api/v1/auth/logout`);
  await page.context().clearCookies();
}

/** Tạo tài khoản member mới với email ngẫu nhiên — tránh phụ thuộc dữ liệu còn sót từ lần chạy trước. */
export async function registerNewMember(page: Page) {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
  const password = "MatKhauE2E123";

  const res = await page.request.post(`${API_URL}/api/v1/auth/register`, {
    data: { fullName: "E2E Member", email, password },
  });
  expect(res.ok(), `Đăng ký thất bại: ${await res.text()}`).toBeTruthy();

  return { email, password };
}

export const test = base;
export { expect };
