import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { prisma } from "@/config/prisma";

// globalSetup.ts đã chạy `prisma migrate deploy` lên DB thật TRƯỚC khi file này được import — nếu
// migration lỗi, toàn bộ run đã dừng ở đó với log rõ ràng (stdio "inherit"). Test ở đây xác nhận
// KẾT QUẢ của việc áp migration đó — bảng đã tồn tại và query được, đúng schema thật, không phải suy
// đoán từ mock.
describe("Migration thật", () => {
  it("migrate deploy đã áp xong — bảng users tồn tại và query được", async () => {
    const count = await prisma.user.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

// Chạy ĐÚNG lệnh production/CI dùng thật (npm run seed:core && npm run seed:domain, xem
// docs/10-trien-khai-van-hanh.md) — không import trực tiếp file seed (chúng tự thực thi ở top-level +
// tự disconnect PrismaClient riêng, không hợp để await từ 1 test). Đây là bằng chứng thật rằng seed
// script không bị hỏng theo thời gian trên đúng schema hiện tại — mock không bao giờ phát hiện được
// việc này (không có schema thật để chạy seed lên).
describe("Seed thật", () => {
  it("seed:core rồi seed:domain chạy sạch trên DB vừa migrate — tạo đủ role/permission/super_admin", () => {
    const env = { ...process.env };

    // stdio "inherit" — nếu seed lỗi, log thật của script (console.error) hiện thẳng ra terminal/CI,
    // không bị nuốt mất trong message chung chung "Command failed" của execSync.
    expect(() =>
      execSync("npx tsx prisma/seed/core.seed.ts", { cwd: process.cwd(), env, stdio: "inherit" }),
    ).not.toThrow();
    expect(() =>
      execSync("npx tsx prisma/seed/domain.seed.ts", { cwd: process.cwd(), env, stdio: "inherit" }),
    ).not.toThrow();
  });

  it("sau khi seed, super_admin mặc định tồn tại thật trong DB kèm role super_admin", async () => {
    const user = await prisma.user.findUnique({
      where: { email: "superadmin@example.com" },
      include: { roles: { include: { role: true } } },
    });

    expect(user).not.toBeNull();
    expect(user?.roles.map((r) => r.role.code)).toContain("super_admin");
  });
});
