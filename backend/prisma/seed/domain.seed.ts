// Seed dữ liệu DOMAIN — riêng cho dự án Flower Shop, KHÔNG copy sang dự án khác.
// Đây là seed tối thiểu cho các role/permission domain đã chốt trong docs/05 §2.1/§2.3.
// Mở rộng dần khi các module domain (products, orders...) được triển khai thật.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DOMAIN_PERMISSIONS = [
  // Gộp 1 permission (không tách view/create/update/delete như bản thiết kế đầu — xem docs/05 §2.3),
  // khớp đúng cách categories.manage đang làm: sales_staff/florist/shipper chưa cần đụng màn quản trị
  // sản phẩm này nên chưa cần tách quyền xem riêng, chỉ admin/super_admin dùng permission này.
  {
    code: "products.manage",
    groupName: "products",
    description: "Thêm/sửa/xoá sản phẩm, quản lý tồn kho",
  },
  {
    code: "categories.manage",
    groupName: "categories",
    description: "Thêm/sửa/xoá danh mục, dịp lễ",
  },
  { code: "orders.view_own", groupName: "orders", description: "Khách xem đơn của chính mình" },
  { code: "orders.view_all", groupName: "orders", description: "Xem toàn bộ đơn hàng hệ thống" },
  { code: "orders.update_status", groupName: "orders", description: "Cập nhật trạng thái đơn" },
  { code: "orders.assign_shipper", groupName: "orders", description: "Phân công người giao hàng" },
  { code: "orders.cancel", groupName: "orders", description: "Huỷ đơn hàng" },
  {
    code: "orders.view_delivery_queue",
    groupName: "orders",
    description: "Xem hàng đợi cần soạn hoa",
  },
  { code: "orders.view_shipping_queue", groupName: "orders", description: "Xem đơn cần giao" },
  { code: "customers.view", groupName: "customers", description: "Xem thông tin khách hàng" },
  {
    code: "customers.manage",
    groupName: "customers",
    description: "Sửa/khoá tài khoản khách hàng",
  },
  {
    code: "promotions.manage",
    groupName: "promotions",
    description: "Tạo/sửa mã giảm giá, chương trình sale",
  },
  { code: "reviews.moderate", groupName: "reviews", description: "Duyệt/ẩn đánh giá" },
  { code: "reports.view", groupName: "reports", description: "Xem thống kê doanh thu, báo cáo" },
  { code: "blog.manage", groupName: "blog", description: "Quản lý bài viết blog, banner" },
  {
    code: "site_content.manage",
    groupName: "site_content",
    description: "Sửa banner Hero, hotline, Zalo, địa chỉ, giờ mở cửa hiển thị trên storefront",
  },
];

// BUG THẬT đã tìm thấy khi làm module Orders: mảng này trước đây THIẾU 'orders.update_status', dù ma
// trận đã chốt ở docs/05 §2.4 ghi rõ admin/super_admin đều có quyền này — nghĩa là trước khi sửa dòng
// này, kể cả super_admin cũng sẽ bị 403 khi đổi trạng thái đơn hàng sang bất kỳ giá trị nào ngoài
// 'cancelled' (huỷ đơn dùng orders.cancel riêng, không bị ảnh hưởng). Đối chiếu kỹ bảng ma trận với
// mảng seed mỗi khi thêm permission mới, đừng chỉ tin permission đã "trông có vẻ" đủ.
const ADMIN_DOMAIN_PERMISSIONS = [
  "products.manage",
  "categories.manage",
  "orders.view_all",
  "orders.update_status",
  "orders.assign_shipper",
  "orders.cancel",
  "orders.view_delivery_queue",
  "orders.view_shipping_queue",
  "customers.view",
  "customers.manage",
  "promotions.manage",
  "reviews.moderate",
  "reports.view",
  "blog.manage",
  "site_content.manage",
];

// Giá trị mặc định KHỚP ĐÚNG hằng số hard-code cũ ở frontend/src/lib/contact-info.ts — seed lần đầu
// không đổi hành vi storefront hiện tại. hero_banner: null (fallback ảnh tĩnh /images/hero-bouquet.png
// ở Hero.tsx cho tới khi admin upload ảnh thật).
const DEFAULT_SITE_CONTENT: Record<string, unknown> = {
  hero_banner: null,
  hotline: "0900 000 000",
  zalo_link: "https://zalo.me/0900000000",
  address: "123 Đường Hoa, Quận 1, TP. Hồ Chí Minh",
  open_hours: "07:00 – 21:00 tất cả các ngày",
};

const SAMPLE_CATEGORIES = [
  { slug: "hoa-sinh-nhat", name: "Sinh nhật" },
  { slug: "hoa-khai-truong", name: "Khai trương" },
  { slug: "hoa-cuoi-hoi", name: "Cưới hỏi" },
  { slug: "hoa-chia-buon", name: "Chia buồn" },
];

// Occasion (dịp lễ) KHÁC category (danh mục) — 1 sản phẩm gắn được NHIỀU dịp lễ cùng lúc (n-n), trong
// khi chỉ thuộc 1 danh mục. Vd "Bó hồng đỏ Passion" vừa hợp Sinh nhật vừa hợp Tỏ tình — xem docs/05 §3.4.
const SAMPLE_OCCASIONS = [
  { slug: "sinh-nhat", name: "Sinh nhật" },
  { slug: "to-tinh", name: "Tỏ tình" },
  { slug: "khai-truong", name: "Khai trương" },
  { slug: "cuoi-hoi", name: "Cưới hỏi" },
  { slug: "chia-buon", name: "Chia buồn" },
  { slug: "cam-on", name: "Cảm ơn" },
];

const SAMPLE_PRODUCTS = [
  {
    slug: "bo-hong-do-passion",
    name: "Bó hồng đỏ Passion",
    categorySlug: "hoa-sinh-nhat",
    occasionSlugs: ["sinh-nhat", "to-tinh"],
    basePrice: 450000,
    description: "<p>12 bông hồng nhập khẩu Ecuador, gói giấy Hàn Quốc.</p>",
  },
  {
    slug: "gio-huong-duong-nang",
    name: "Giỏ hướng dương nắng",
    categorySlug: "hoa-sinh-nhat",
    occasionSlugs: ["sinh-nhat", "cam-on"],
    basePrice: 380000,
    description: "<p>Giỏ mây tự nhiên, hoa hướng dương tươi rực rỡ.</p>",
  },
  {
    slug: "bo-tulip-vang-nang",
    name: "Bó tulip vàng nắng",
    categorySlug: "hoa-sinh-nhat",
    occasionSlugs: ["sinh-nhat"],
    basePrice: 520000,
    description: "<p>15 cành tulip Hà Lan, tươi mới mỗi ngày.</p>",
  },
  {
    slug: "lang-khai-truong-phu-quy",
    name: "Lẵng khai trương Phú Quý",
    categorySlug: "hoa-khai-truong",
    occasionSlugs: ["khai-truong"],
    basePrice: 1250000,
    description: "<p>Cao 1m2, kèm dải lụa chúc mừng.</p>",
  },
  {
    slug: "ke-hoa-khai-truong-hong-phat",
    name: "Kệ hoa khai trương Hồng Phát",
    categorySlug: "hoa-khai-truong",
    occasionSlugs: ["khai-truong", "cam-on"],
    basePrice: 1450000,
    description: "<p>Cao 1m5, phối lay ơn và đồng tiền.</p>",
  },
  {
    slug: "cam-tay-co-dau-ivory",
    name: "Cầm tay cô dâu Ivory",
    categorySlug: "hoa-cuoi-hoi",
    occasionSlugs: ["cuoi-hoi"],
    basePrice: 620000,
    description: "<p>Hoa mẫu đơn phối baby trắng, phong cách tối giản.</p>",
  },
  {
    slug: "bo-hoa-cuoi-hong-pastel",
    name: "Bó hoa cưới hồng pastel",
    categorySlug: "hoa-cuoi-hoi",
    occasionSlugs: ["cuoi-hoi"],
    basePrice: 680000,
    description: "<p>Hồng phấn phối baby, tông pastel nhẹ nhàng.</p>",
  },
  {
    slug: "vong-hoa-chia-buon-trang",
    name: "Vòng hoa chia buồn trắng",
    categorySlug: "hoa-chia-buon",
    occasionSlugs: ["chia-buon"],
    basePrice: 850000,
    description: "<p>Hoa cúc trắng và ly ly, trang trọng.</p>",
  },
];

const DOMAIN_ROLES = [
  // sales_staff KHÔNG có products.manage nữa (permission cũ products.view đã bị gộp — xem
  // DOMAIN_PERMISSIONS phía trên) — nếu sau này cần cho sales_staff xem (không sửa) sản phẩm, tách
  // thêm 1 permission `products.view` riêng lúc đó, đừng gán products.manage (bao gồm cả xoá).
  {
    code: "sales_staff",
    name: "Nhân viên bán hàng",
    permissionCodes: [
      "orders.view_all",
      "orders.update_status",
      "orders.assign_shipper",
      "orders.cancel",
      "customers.view",
    ],
  },
  {
    code: "florist",
    name: "Nhân viên cắm hoa",
    permissionCodes: ["orders.view_delivery_queue", "orders.update_status"],
  },
  {
    code: "shipper",
    name: "Người giao hàng",
    permissionCodes: ["orders.view_shipping_queue", "orders.update_status"],
  },
];

// Mã mẫu để demo /thanh-toan và trang quản trị mã giảm giá — CHAOMUNG10 không giới hạn lượt dùng,
// FLASH50K có usageLimit thấp để dễ demo luồng "hết lượt dùng" khi test tay.
const SAMPLE_COUPONS = [
  { code: "CHAOMUNG10", type: "percent", value: 10, minOrderValue: 200000 },
  { code: "FLASH50K", type: "fixed", value: 50000, minOrderValue: 300000, usageLimit: 20 },
];

// Bài mẫu để demo trang /blog — publishedAt cố định trong quá khứ (không phải `new Date()`, để mỗi
// lần chạy lại seed không đổi thứ tự hiển thị theo thời gian seed).
const SAMPLE_BLOG_POSTS = [
  {
    title: "5 mẫu hoa sinh nhật được yêu thích nhất 2026",
    slug: "5-mau-hoa-sinh-nhat-duoc-yeu-thich-nhat-2026",
    excerpt: "Gợi ý những bó hoa sinh nhật rực rỡ, phù hợp cho mọi lứa tuổi.",
    content: "<p>Sinh nhật là dịp đặc biệt để gửi gắm lời chúc qua những bó hoa tươi thắm...</p>",
    publishedAt: new Date("2026-09-01T00:00:00.000Z"),
  },
  {
    title: "Cách giữ hoa tươi lâu hơn tại nhà",
    slug: "cach-giu-hoa-tuoi-lau-hon-tai-nha",
    excerpt: "Vài mẹo đơn giản giúp bó hoa của bạn tươi lâu thêm nhiều ngày.",
    content: "<p>Thay nước mỗi 2 ngày, cắt vát gốc cành hoa, tránh ánh nắng trực tiếp...</p>",
    publishedAt: new Date("2026-09-05T00:00:00.000Z"),
  },
];

async function main() {
  console.log("Seeding DOMAIN: permissions...");
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
  console.log("Seeding DOMAIN: admin + super_admin permissions...");
  for (const roleCode of ["admin", "super_admin"]) {
    const role = await prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) {
      console.warn(`  -> Role "${roleCode}" chưa tồn tại — chạy \`npm run seed:core\` trước.`);
      continue;
    }
    const perms = await prisma.permission.findMany({
      where: { code: { in: ADMIN_DOMAIN_PERMISSIONS } },
    });
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }

  // docs/05 §2.4 (ma trận Vai trò × Quyền): member có orders.view_own — dùng ADDITIVE giống vòng lặp
  // admin/super_admin phía trên (createMany + skipDuplicates, KHÔNG deleteMany trước), vì role `member`
  // do core.seed.ts tạo và có thể được gán thêm permission core khác sau này — domain.seed.ts không
  // nên xoá sạch rồi ghi đè permission của 1 role mà mình không sở hữu hoàn toàn.
  console.log("Seeding DOMAIN: member permissions...");
  const memberRole = await prisma.role.findUnique({ where: { code: "member" } });
  if (!memberRole) {
    console.warn('  -> Role "member" chưa tồn tại — chạy `npm run seed:core` trước.');
  } else {
    const memberPerms = await prisma.permission.findMany({
      where: { code: { in: ["orders.view_own"] } },
    });
    await prisma.rolePermission.createMany({
      data: memberPerms.map((p) => ({ roleId: memberRole.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }

  // update: {} — KHÔNG ghi đè giá trị admin đã đổi khi seed chạy lại, đúng pattern DEFAULT_SYSTEM_SETTINGS
  // ở core.seed.ts (cùng bảng system_settings, chỉ khác namespace key).
  console.log("Seeding DOMAIN: default site content (banner/hotline/zalo/địa chỉ/giờ mở cửa)...");
  for (const [key, value] of Object.entries(DEFAULT_SITE_CONTENT)) {
    await prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: JSON.stringify(value) },
      update: {},
    });
  }

  console.log("Seeding DOMAIN: roles (sales_staff, florist, shipper)...");
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

  // Dữ liệu mẫu cho storefront (xem app/(storefront)/page.tsx) — KHÔNG có ảnh (seed script không tự
  // upload lên Cloudinary được); storefront tự hiện icon hoa thay thế khi sản phẩm/danh mục chưa có
  // ảnh, giống đúng cách admin panel đang làm.
  console.log("Seeding DOMAIN: sample categories...");
  const categoryIdBySlug: Record<string, string> = {};
  for (const c of SAMPLE_CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { slug: c.slug },
      create: { name: c.name, slug: c.slug },
      update: { name: c.name },
    });
    categoryIdBySlug[c.slug] = category.id;
  }

  console.log("Seeding DOMAIN: sample occasions...");
  const occasionIdBySlug: Record<string, string> = {};
  for (const o of SAMPLE_OCCASIONS) {
    const occasion = await prisma.occasion.upsert({
      where: { slug: o.slug },
      create: { name: o.name, slug: o.slug },
      update: { name: o.name },
    });
    occasionIdBySlug[o.slug] = occasion.id;
  }

  console.log("Seeding DOMAIN: sample products...");
  for (const p of SAMPLE_PRODUCTS) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        basePrice: p.basePrice,
        categoryId: categoryIdBySlug[p.categorySlug],
        isActive: true,
      },
      update: {},
    });
    await prisma.productOccasion.createMany({
      data: p.occasionSlugs.map((slug) => ({
        productId: product.id,
        occasionId: occasionIdBySlug[slug]!,
      })),
      skipDuplicates: true,
    });
  }

  // Mã mẫu để demo tính năng — 1 mã % không giới hạn, 1 mã fixed có usageLimit để thấy được luồng
  // "hết lượt dùng" khi test tay.
  console.log("Seeding DOMAIN: sample coupons...");
  for (const c of SAMPLE_COUPONS) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      create: c,
      update: {},
    });
  }

  // Bài mẫu để demo trang /blog — gán authorId cho super_admin nếu tìm thấy (không bắt buộc, authorId
  // nullable — bài viết vẫn hiển thị được kể cả không tìm thấy tài khoản này, xem blog.service.ts).
  console.log("Seeding DOMAIN: sample blog posts...");
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || "superadmin@example.com";
  const superAdmin = await prisma.user.findUnique({ where: { email: superAdminEmail } });
  for (const post of SAMPLE_BLOG_POSTS) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      create: { ...post, authorId: superAdmin?.id },
      update: {},
    });
  }

  console.log("Seed DOMAIN hoàn tất.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
