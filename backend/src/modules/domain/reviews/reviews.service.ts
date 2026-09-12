import { prisma } from "../../../config/prisma";
import { AppError } from "../../../shared/errors";
import { buildPaginationMeta } from "../../../shared/response/ApiResponse";
import * as auditLog from "../../core/audit-log/auditLog.service";
import type {
  CreateReviewInput,
  ListAdminReviewsQuery,
  ListOwnReviewsQuery,
  ListReviewsQuery,
} from "./reviews.validation";

// Công khai — chỉ tên người viết (không email/phone), KHÔNG có isApproved (mọi review trả về ở đây
// LUÔN đã duyệt, cờ isApproved chỉ có ý nghĩa nội bộ cho hàng đợi duyệt).
const REVIEW_PUBLIC_SELECT = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  user: { select: { id: true, fullName: true } },
} as const;

// Dùng cho /account/reviews (chủ sở hữu xem lại review của MÌNH, cần biết đang chờ duyệt hay đã
// duyệt) và /admin/reviews (hàng đợi duyệt, cần biết review thuộc sản phẩm nào).
const REVIEW_FULL_SELECT = {
  ...REVIEW_PUBLIC_SELECT,
  productId: true,
  isApproved: true,
  updatedAt: true,
  product: { select: { id: true, name: true, slug: true } },
} as const;

// Công khai — CHỈ đánh giá ĐÃ DUYỆT, đúng 1 sản phẩm (bắt buộc `productId`, không có "xem tất cả đánh
// giá toàn shop" — không có nhu cầu thật cho trang này).
export async function listPublic({ productId, page, limit }: ListReviewsQuery) {
  const where = { productId, isApproved: true };
  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: REVIEW_PUBLIC_SELECT,
    }),
    prisma.review.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

// Chờ duyệt mặc định (isApproved: false) — cờ `reviews.moderate` mới cho hiện công khai. Mỗi user
// chỉ đánh giá 1 lần/sản phẩm (unique constraint DB, kiểm tra trước để trả lỗi rõ ràng thay vì để
// Postgres throw lỗi unique violation chung chung).
export async function create(userId: string, input: CreateReviewInput) {
  const product = await prisma.product.findFirst({
    where: { id: input.productId, deletedAt: null },
  });
  if (!product) throw new AppError("Sản phẩm không tồn tại", 404, "PRODUCT_NOT_FOUND");

  const existing = await prisma.review.findUnique({
    where: { productId_userId: { productId: input.productId, userId } },
  });
  if (existing) {
    throw new AppError("Bạn đã đánh giá sản phẩm này rồi", 409, "REVIEW_ALREADY_EXISTS");
  }

  const review = await prisma.review.create({
    data: {
      productId: input.productId,
      userId,
      rating: input.rating,
      comment: input.comment,
      isApproved: false,
    },
    select: REVIEW_FULL_SELECT,
  });

  await auditLog.record({
    actorId: userId,
    action: "review.create",
    entityType: "review",
    entityId: review.id,
    after: review,
  });

  return review;
}

// docs/12 §5.1 — row-level check: khách xem lại review CỦA MÌNH (kể cả đang chờ duyệt), lọc NGAY
// trong query.
export async function listOwn(userId: string, { page, limit }: ListOwnReviewsQuery) {
  const where = { userId };
  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: REVIEW_FULL_SELECT,
    }),
    prisma.review.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

// Hàng đợi duyệt (permission `reviews.moderate`) — mặc định lấy CẢ chờ duyệt lẫn đã duyệt (không lọc
// isApproved trừ khi truyền rõ), khác listPublic() luôn chỉ đã duyệt.
export async function listAdmin({ isApproved, productId, page, limit }: ListAdminReviewsQuery) {
  const where = {
    ...(isApproved !== undefined && { isApproved }),
    ...(productId && { productId }),
  };
  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: REVIEW_FULL_SELECT,
    }),
    prisma.review.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function moderate(actorId: string, id: string, isApproved: boolean) {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw new AppError("Đánh giá không tồn tại", 404, "NOT_FOUND");

  const updated = await prisma.review.update({
    where: { id },
    data: { isApproved },
    select: REVIEW_FULL_SELECT,
  });

  await auditLog.record({
    actorId,
    action: "review.moderate",
    entityType: "review",
    entityId: id,
    before: { isApproved: review.isApproved },
    after: { isApproved },
  });

  return updated;
}

export async function remove(actorId: string, id: string): Promise<void> {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw new AppError("Đánh giá không tồn tại", 404, "NOT_FOUND");

  await prisma.review.delete({ where: { id } });

  await auditLog.record({
    actorId,
    action: "review.delete",
    entityType: "review",
    entityId: id,
    before: review,
  });
}
