import { describe, expect, it } from "vitest";
import { prisma } from "@/config/prisma";

// 3 ví dụ đại diện cho ràng buộc DATABASE THẬT mà tests/integration/ (Prisma mock) không bao giờ chạm
// tới — mock chỉ trả về đúng thứ test tự mockResolvedValue, không tự throw P2002 hay tự cascade xoá.
// Không cố phủ hết mọi ràng buộc trong schema.prisma, chỉ đủ chứng minh giá trị của tầng test này.
// Dữ liệu tự tạo với hậu tố ngẫu nhiên (giống nguyên tắc E2E ở docs/08 §4.2) — nhiều lần chạy trên
// cùng container không đụng nhau.

describe("Ràng buộc unique thật (User.email)", () => {
  it("tạo 2 user cùng email → Prisma ném lỗi P2002 thật", async () => {
    const email = `db-test-${Date.now()}@example.com`;
    await prisma.user.create({
      data: { fullName: "A", email, passwordHash: "x" },
    });

    await expect(
      prisma.user.create({ data: { fullName: "B", email, passwordHash: "y" } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});

describe("onDelete: Cascade thật (Role → RolePermission)", () => {
  it("xoá Role tự động xoá theo RolePermission liên kết, không cần xoá tay trước", async () => {
    const suffix = Date.now();
    // Tự tạo Role/Permission riêng (không dựa vào dữ liệu seed ở file khác) — đúng nguyên tắc "tự tạo
    // dữ liệu" đã áp dụng cho E2E (docs/08 §4.2), và thứ tự chạy các file *.test.ts không được đảm bảo.
    const role = await prisma.role.create({
      data: { code: `db-test-role-${suffix}`, name: "DB test role" },
    });
    const permission = await prisma.permission.create({
      data: { code: `db-test-permission-${suffix}`, groupName: "db-test" },
    });
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });

    await prisma.role.delete({ where: { id: role.id } });

    const remaining = await prisma.rolePermission.findMany({ where: { roleId: role.id } });
    expect(remaining).toHaveLength(0);
  });
});

describe("Composite unique thật (FileUsage[fileId, entityType, entityId])", () => {
  it("gắn cùng 1 file vào cùng 1 entity 2 lần → Prisma ném lỗi P2002 thật", async () => {
    const suffix = Date.now();
    const file = await prisma.file.create({
      data: {
        cloudinaryPublicId: `db-test-${suffix}`,
        url: `https://res.cloudinary.com/db-test-${suffix}.jpg`,
        mimeType: "image/jpeg",
        sizeBytes: 1,
        originalName: "db-test.jpg",
      },
    });
    const usageInput = {
      fileId: file.id,
      entityType: "site_content",
      entityId: `db-test-${suffix}`,
    };
    await prisma.fileUsage.create({ data: usageInput });

    await expect(prisma.fileUsage.create({ data: usageInput })).rejects.toMatchObject({
      code: "P2002",
    });
  });
});
