// Seed dữ liệu DOMAIN — riêng cho dự án Flower Shop, KHÔNG copy sang dự án khác.
// Đây là seed tối thiểu cho các role/permission domain đã chốt trong docs/05 §2.1/§2.3.
// Mở rộng dần khi các module domain (products, orders...) được triển khai thật.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DOMAIN_PERMISSIONS = [
  { code: 'products.view', groupName: 'products', description: 'Xem danh sách/chi tiết sản phẩm' },
  { code: 'products.create', groupName: 'products', description: 'Thêm sản phẩm mới' },
  { code: 'products.update', groupName: 'products', description: 'Sửa sản phẩm, tồn kho' },
  { code: 'products.delete', groupName: 'products', description: 'Xoá/ẩn sản phẩm' },
  { code: 'categories.manage', groupName: 'categories', description: 'Thêm/sửa/xoá danh mục, dịp lễ' },
  { code: 'orders.view_own', groupName: 'orders', description: 'Khách xem đơn của chính mình' },
  { code: 'orders.view_all', groupName: 'orders', description: 'Xem toàn bộ đơn hàng hệ thống' },
  { code: 'orders.update_status', groupName: 'orders', description: 'Cập nhật trạng thái đơn' },
  { code: 'orders.assign_shipper', groupName: 'orders', description: 'Phân công người giao hàng' },
  { code: 'orders.cancel', groupName: 'orders', description: 'Huỷ đơn hàng' },
  { code: 'orders.view_delivery_queue', groupName: 'orders', description: 'Xem hàng đợi cần soạn hoa' },
  { code: 'orders.view_shipping_queue', groupName: 'orders', description: 'Xem đơn cần giao' },
  { code: 'customers.view', groupName: 'customers', description: 'Xem thông tin khách hàng' },
  { code: 'customers.manage', groupName: 'customers', description: 'Sửa/khoá tài khoản khách hàng' },
  { code: 'promotions.manage', groupName: 'promotions', description: 'Tạo/sửa mã giảm giá, chương trình sale' },
  { code: 'reviews.moderate', groupName: 'reviews', description: 'Duyệt/ẩn đánh giá' },
  { code: 'reports.view', groupName: 'reports', description: 'Xem thống kê doanh thu, báo cáo' },
  { code: 'blog.manage', groupName: 'blog', description: 'Quản lý bài viết blog, banner' },
];

const ADMIN_DOMAIN_PERMISSIONS = [
  'products.view', 'products.create', 'products.update', 'products.delete', 'categories.manage',
  'orders.view_all', 'orders.assign_shipper', 'orders.cancel', 'orders.view_delivery_queue',
  'orders.view_shipping_queue', 'customers.view', 'customers.manage', 'promotions.manage',
  'reviews.moderate', 'reports.view', 'blog.manage',
];

const DOMAIN_ROLES = [
  { code: 'sales_staff', name: 'Nhân viên bán hàng', permissionCodes: ['products.view', 'orders.view_all', 'orders.update_status', 'orders.assign_shipper', 'orders.cancel', 'customers.view'] },
  { code: 'florist', name: 'Nhân viên cắm hoa', permissionCodes: ['orders.view_delivery_queue', 'orders.update_status'] },
  { code: 'shipper', name: 'Người giao hàng', permissionCodes: ['orders.view_shipping_queue', 'orders.update_status'] },
];

async function main() {
  console.log('Seeding DOMAIN: permissions...');
  for (const p of DOMAIN_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: { ...p, isSystem: true, isRestricted: false },
      update: { groupName: p.groupName, description: p.description },
    });
  }

  // Theo đúng ma trận Vai trò × Quyền đã chốt (docs/05 §2.4): super_admin có hầu hết quyền domain
  // giống admin (ngoại trừ các quyền 🔒 core is_restricted đã seed riêng ở core.seed.ts). super_admin
  // KHÔNG tự động có mọi permission chỉ vì là super_admin — authorize() chỉ check permissions thật sự
  // được gán, nên thiếu bước này thì super_admin cũng bị FORBIDDEN như user thường (đã từng xảy ra).
  console.log('Seeding DOMAIN: admin + super_admin permissions...');
  for (const roleCode of ['admin', 'super_admin']) {
    const role = await prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) {
      console.warn(`  -> Role "${roleCode}" chưa tồn tại — chạy \`npm run seed:core\` trước.`);
      continue;
    }
    const perms = await prisma.permission.findMany({ where: { code: { in: ADMIN_DOMAIN_PERMISSIONS } } });
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }

  console.log('Seeding DOMAIN: roles (sales_staff, florist, shipper)...');
  for (const r of DOMAIN_ROLES) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      create: { code: r.code, name: r.name, isSystem: true },
      update: { name: r.name },
    });
    const perms = await prisma.permission.findMany({ where: { code: { in: r.permissionCodes } } });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }

  console.log('Seeding DOMAIN: sample categories...');
  await prisma.category.upsert({
    where: { slug: 'hoa-sinh-nhat' },
    create: { name: 'Hoa sinh nhật', slug: 'hoa-sinh-nhat' },
    update: {},
  });

  console.log('Seed DOMAIN hoàn tất.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
