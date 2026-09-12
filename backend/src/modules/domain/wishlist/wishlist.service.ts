import { prisma } from "../../../config/prisma";
import { AppError } from "../../../shared/errors";

const WISHLIST_SELECT = {
  productId: true,
  createdAt: true,
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      basePrice: true,
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { file: { select: { url: true } } },
      },
    },
  },
} as const;

// Dữ liệu cá nhân — không permission riêng, không audit log (giống addresses.service.ts). Lọc thêm
// `product: { deletedAt: null }` — sản phẩm đã xoá mềm không nên hiện trong danh sách yêu thích nữa,
// dù dòng wishlist vẫn còn trong DB (không dọn tự động, tránh phức tạp hoá — chỉ ẩn khỏi kết quả).
export async function list(userId: string) {
  const rows = await prisma.wishlist.findMany({
    where: { userId, product: { deletedAt: null } },
    orderBy: { createdAt: "desc" },
    select: WISHLIST_SELECT,
  });
  return rows.map((row) => ({ ...row.product, savedAt: row.createdAt }));
}

export async function add(userId: string, productId: string) {
  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
  if (!product) throw new AppError("Sản phẩm không tồn tại", 404, "PRODUCT_NOT_FOUND");

  // Idempotent — bấm "yêu thích" 2 lần (vd double-click, hoặc đã có ở tab khác) không nên báo lỗi.
  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (existing) return existing;

  return prisma.wishlist.create({ data: { userId, productId } });
}

// Idempotent — xoá 1 dòng không tồn tại (đã xoá trước đó, hoặc chưa từng thêm) vẫn trả về bình
// thường, không cần 404 (khác addresses/reviews — ở đây không có gì để "chống nhầm sở hữu", vì
// where luôn tự giới hạn theo ĐÚNG userId đang đăng nhập, deleteMany khớp 0 dòng cũng không phải lỗi).
export async function remove(userId: string, productId: string): Promise<void> {
  await prisma.wishlist.deleteMany({ where: { userId, productId } });
}
