// Seed dữ liệu CORE — chạy giống nhau ở mọi dự án dùng source base này.
// Domain (role/permission riêng nghiệp vụ) nằm ở prisma/seed/domain.seed.ts.
// Xem docs/05 §4, docs/02 §2.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CORE_PERMISSIONS = [
  {
    code: "users.manage",
    groupName: "users",
    isRestricted: true,
    description: "Block/unblock, reset password, đổi role user (chỉ super_admin)",
  },
  {
    code: "settings.manage",
    groupName: "settings",
    isRestricted: true,
    description: "Cấu hình hệ thống, bật/tắt phương thức đăng nhập (chỉ super_admin)",
  },
  {
    code: "roles.manage",
    groupName: "roles",
    isRestricted: true,
    description: "Tạo/sửa/xoá role tuỳ ý, gán permission cho role (chỉ super_admin)",
  },
  {
    code: "permissions.manage",
    groupName: "permissions",
    isRestricted: true,
    description: "Tạo/sửa/xoá permission (chỉ super_admin)",
  },
  {
    code: "files.manage",
    groupName: "files",
    isRestricted: false,
    description: "Xem/xoá file trong màn quản lý tài nguyên",
  },
  {
    code: "audit.view",
    groupName: "audit",
    isRestricted: false,
    description: "Xem nhật ký Audit Log",
  },
  {
    code: "contact.manage",
    groupName: "contact",
    isRestricted: false,
    description: "Xem tin nhắn Liên hệ khách gửi, đánh dấu đã xử lý",
  },
];

const CORE_ROLES = [
  {
    code: "super_admin",
    name: "Super Admin",
    isSystem: true,
    permissionCodes: CORE_PERMISSIONS.map((p) => p.code),
  },
  {
    code: "admin",
    name: "Admin",
    isSystem: true,
    permissionCodes: ["files.manage", "contact.manage"],
  },
  { code: "member", name: "Member", isSystem: true, permissionCodes: [] as string[] },
];

const LOGIN_METHODS = ["google_oauth", "email_password", "magic_link"];

async function main() {
  console.log("Seeding CORE: permissions...");
  for (const p of CORE_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: { ...p, isSystem: true },
      update: {
        groupName: p.groupName,
        isRestricted: p.isRestricted,
        description: p.description,
        isSystem: true,
      },
    });
  }

  console.log("Seeding CORE: roles...");
  for (const r of CORE_ROLES) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      create: { code: r.code, name: r.name, isSystem: r.isSystem },
      update: { name: r.name, isSystem: r.isSystem },
    });

    // CHỈ THÊM (createMany + skipDuplicates), KHÔNG deleteMany trước — 'admin'/'super_admin' là role
    // DÙNG CHUNG với domain.seed.ts (role đó gán thêm categories.manage/products.manage.../ADMIN_
    // DOMAIN_PERMISSIONS theo kiểu additive, không xoá). Bug THẬT đã xảy ra: trước đây có deleteMany
    // ở đây — chạy lại `npm run seed:core` (vd sau khi thêm 1 core permission mới) SAU khi đã chạy
    // `seed:domain` sẽ xoá sạch mọi permission domain đã gán cho admin/super_admin, làm cả trang
    // /admin/categories lẫn /admin/products báo 403 dù trước đó vẫn dùng bình thường. Đánh đổi: nếu
    // 1 permission bị RÚT khỏi permissionCodes trong code, seed sẽ không tự thu hồi permission đó —
    // chấp nhận được (domain.seed.ts đã chọn đánh đổi y hệt cho admin/super_admin), an toàn hơn nhiều
    // so với việc âm thầm mất quyền.
    const permissions = await prisma.permission.findMany({
      where: { code: { in: r.permissionCodes } },
    });
    if (permissions.length) {
      await prisma.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
        skipDuplicates: true,
      });
    }
  }

  console.log("Seeding CORE: login method settings...");
  for (const method of LOGIN_METHODS) {
    await prisma.loginMethodSetting.upsert({
      where: { method },
      create: { method, isEnabled: true },
      update: {},
    });
  }

  console.log("Seeding CORE: system settings...");
  // `update: {}` — không ghi đè giá trị admin đã đổi ở lần seed sau, giống hệt cách làm với
  // login method settings ở trên. Xem docs/12 (Phase 4), systemSettings.validation.ts.
  const DEFAULT_SYSTEM_SETTINGS: Record<string, unknown> = {
    site_name: "Hoa Xinh",
    site_logo: null,
    timezone: "Asia/Ho_Chi_Minh",
    registration_enabled: true,
  };
  for (const [key, value] of Object.entries(DEFAULT_SYSTEM_SETTINGS)) {
    await prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: JSON.stringify(value) },
      update: {},
    });
  }

  console.log("Seeding CORE: default super_admin account...");
  const email = process.env.SUPER_ADMIN_EMAIL || "superadmin@example.com";
  const password = process.env.SUPER_ADMIN_PASSWORD || "ChangeMe123!";
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 12);
    const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { code: "super_admin" } });
    await prisma.user.create({
      data: {
        fullName: "Super Admin",
        email,
        passwordHash,
        emailVerifiedAt: new Date(),
        roles: { create: { roleId: superAdminRole.id } },
      },
    });
    console.log(
      `  -> Đã tạo super_admin: ${email} / ${password} (ĐỔI MẬT KHẨU NGAY sau lần đăng nhập đầu)`,
    );
  } else {
    console.log(`  -> super_admin (${email}) đã tồn tại, bỏ qua.`);
  }

  console.log("Seed CORE hoàn tất.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
