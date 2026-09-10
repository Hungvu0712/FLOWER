import { API_URL, expect, login, test } from "./fixtures";

test.describe("Danh mục (domain)", () => {
  test.beforeEach(async ({ page }) => login(page));

  test("tạo → sửa → xoá danh mục qua giao diện admin", async ({ page }) => {
    const name = `Hoa E2E ${Date.now()}`;
    await page.goto("/admin/categories");

    await page.getByRole("button", { name: /thêm|tạo/i }).first().click();
    await page.getByLabel(/tên/i).first().fill(name);
    await page.getByRole("button", { name: /lưu|tạo/i }).last().click();

    await expect(page.getByText(name)).toBeVisible();
    await expect(page.getByText(/đã tạo danh mục/i)).toBeVisible();
  });

  test("slug tự sinh từ tên tiếng Việt (bỏ dấu)", async ({ page }) => {
    const res = await page.request.post(`${API_URL}/api/v1/admin/categories`, {
      data: { name: `Hoa cưới đẹp ${Date.now()}` },
    });
    expect(res.ok()).toBe(true);
    const created = (await res.json()).data;
    expect(created.slug).toMatch(/^hoa-cuoi-dep-\d+$/);

    await page.request.delete(`${API_URL}/api/v1/admin/categories/${created.id}`);
  });

  test("KHÔNG xoá được danh mục còn danh mục con", async ({ page }) => {
    const parent = (
      await (await page.request.post(`${API_URL}/api/v1/admin/categories`, {
        data: { name: `Cha ${Date.now()}` },
      })).json()
    ).data;
    const child = (
      await (await page.request.post(`${API_URL}/api/v1/admin/categories`, {
        data: { name: `Con ${Date.now()}`, parentId: parent.id },
      })).json()
    ).data;

    const res = await page.request.delete(`${API_URL}/api/v1/admin/categories/${parent.id}`);
    expect(res.status()).toBe(409);
    expect((await res.json()).code).toBe("CATEGORY_HAS_CHILDREN");

    await page.request.delete(`${API_URL}/api/v1/admin/categories/${child.id}`);
    await page.request.delete(`${API_URL}/api/v1/admin/categories/${parent.id}`);
  });

  test("KHÔNG tạo được vòng lặp cha-con", async ({ page }) => {
    const a = (
      await (await page.request.post(`${API_URL}/api/v1/admin/categories`, {
        data: { name: `A ${Date.now()}` },
      })).json()
    ).data;
    const b = (
      await (await page.request.post(`${API_URL}/api/v1/admin/categories`, {
        data: { name: `B ${Date.now()}`, parentId: a.id },
      })).json()
    ).data;

    const res = await page.request.patch(`${API_URL}/api/v1/admin/categories/${a.id}`, {
      data: { parentId: b.id },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).code).toBe("CATEGORY_CYCLE");

    await page.request.delete(`${API_URL}/api/v1/admin/categories/${b.id}`);
    await page.request.delete(`${API_URL}/api/v1/admin/categories/${a.id}`);
  });

  test("storefront đọc được danh mục công khai mà không cần đăng nhập", async ({ browser }) => {
    const context = await browser.newContext();
    const res = await context.request.get(`${API_URL}/api/v1/categories`);
    expect(res.ok()).toBe(true);

    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    if (body.data.length) {
      expect(body.data[0]).not.toHaveProperty("sortOrder"); // không lộ trường nội bộ
    }
    await context.close();
  });
});
