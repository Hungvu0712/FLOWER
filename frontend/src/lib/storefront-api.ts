// Fetch DỮ LIỆU CÔNG KHAI cho các trang storefront (Server Component) — dùng `fetch` gốc của
// Next.js thay vì instance `axios` ở lib/axios.ts, vì instance đó gắn interceptor refresh-token/
// cookie trình duyệt (withCredentials), không hợp để gọi từ server lúc render trang. 2 endpoint này
// công khai (không cần đăng nhập) nên không cần cookie gì cả.

import type { Order } from '@/features/domain/orders/orders.service';
import { DEFAULT_SITE_CONTENT } from './contact-info';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  imageFile: { url: string } | null;
};

// Tag dịp lễ (Sinh nhật, Valentine...) — 1 sản phẩm gắn được NHIỀU dịp lễ (n-n), khác category (1-n).
// Xem docs/05 §3.4, docs/modules/domain-occasions.md.
export type StorefrontOccasion = { id: string; name: string; slug: string };

export type StorefrontProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  category: { id: string; name: string; slug: string } | null;
  images: {
    id: string;
    sortOrder: number;
    file: { id: string; url: string };
  }[];
  // Mảng rỗng = không có biến thể, dùng thẳng basePrice — trang chi tiết bắt chọn 1 biến thể mới ra
  // giá thật khi mảng này không rỗng, xem san-pham/[slug]/page.tsx. Xem docs/05 §3.4.
  variants: { id: string; name: string; price: number }[];
  occasions: StorefrontOccasion[];
};

// revalidate 60s — danh mục/sản phẩm đổi qua admin panel không cần hiện ngay lập tức trên storefront,
// nhưng cũng không nên cache vô thời hạn (mặc định fetch trong Server Component ở Next.js).
async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const body = await res.json();
    return body.data as T;
  } catch {
    // Backend tạm thời không phản hồi (vd đang deploy) — storefront vẫn render, chỉ thiếu phần dữ
    // liệu động, không sập cả trang.
    return null;
  }
}

export async function getStorefrontCategories(): Promise<StorefrontCategory[]> {
  return (await getJson<StorefrontCategory[]>('/api/v1/categories')) ?? [];
}

export async function getStorefrontOccasions(): Promise<StorefrontOccasion[]> {
  return (await getJson<StorefrontOccasion[]>('/api/v1/occasions')) ?? [];
}

// Không có endpoint GET /occasions/:slug riêng ở backend — cùng lý do với getStorefrontCategoryBySlug
// (danh sách occasions đủ nhỏ, chưa phân trang).
export async function getStorefrontOccasionBySlug(
  slug: string,
): Promise<StorefrontOccasion | null> {
  const occasions = await getStorefrontOccasions();
  return occasions.find((o) => o.slug === slug) ?? null;
}

// Không có endpoint GET /categories/:slug riêng ở backend — danh sách categories đủ nhỏ (chưa phân
// trang) nên tra bằng slug ngay trên kết quả list công khai, khỏi cần thêm endpoint mới.
export async function getStorefrontCategoryBySlug(
  slug: string,
): Promise<StorefrontCategory | null> {
  const categories = await getStorefrontCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}

// Có endpoint GET /products/:slug riêng ở backend (khác categories) — danh sách sản phẩm có phân
// trang, không thể tải hết rồi lọc ở FE như getStorefrontCategoryBySlug đang làm.
export async function getStorefrontProductBySlug(slug: string): Promise<StorefrontProduct | null> {
  return getJson<StorefrontProduct>(`/api/v1/products/${encodeURIComponent(slug)}`);
}

// Trang xác nhận đơn hàng (public, `id` dạng UUID đóng vai trò token tra cứu — xem backend
// orders.routes.ts) — trả null cả khi 404 lẫn khi backend tạm không phản hồi (getJson nuốt lỗi mạng),
// trang gọi hàm này tự xử lý null bằng `notFound()`.
export async function getOrderById(id: string): Promise<Order | null> {
  return getJson<Order>(`/api/v1/orders/${encodeURIComponent(id)}`);
}

export type StorefrontBlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  publishedAt: string | null;
  author: { id: string; fullName: string } | null;
  thumbnailFile: { id: string; url: string } | null;
};

// Không có endpoint riêng trả kèm meta phân trang cần dùng ở storefront (chưa có nút "xem thêm" cho
// /blog, giống cách getStorefrontProducts cũng bỏ qua `meta`) — chỉ cần `limit` đủ lớn.
export async function getStorefrontBlogPosts({ limit = 12 }: { limit?: number } = {}): Promise<
  StorefrontBlogPost[]
> {
  const result = await getJson<StorefrontBlogPost[]>(`/api/v1/blog?limit=${limit}`);
  return result ?? [];
}

export async function getStorefrontBlogPostBySlug(
  slug: string,
): Promise<StorefrontBlogPost | null> {
  return getJson<StorefrontBlogPost>(`/api/v1/blog/${encodeURIComponent(slug)}`);
}

// Banner Hero + hotline/Zalo/địa chỉ/giờ mở cửa — admin sửa qua /admin/site-content. Trả object phẳng
// (không phải mảng key-value thô) để component dùng thẳng, kèm fallback DEFAULT_SITE_CONTENT khi
// backend tạm không phản hồi (getJson nuốt lỗi mạng, trả null) — storefront không bao giờ trống info.
export type StorefrontSiteContent = {
  hotline: string;
  /** Chỉ chữ số, dùng cho href="tel:" — hotline hiển thị có thể có khoảng trắng/dấu. */
  hotlineTel: string;
  zaloLink: string;
  /** zaloLink bỏ tiền tố https:// — hiển thị gọn hơn link đầy đủ. */
  zaloDisplay: string;
  address: string;
  openHours: string;
  heroBannerUrl: string | null;
};

function deriveSiteContent(byKey: Map<string, unknown>): StorefrontSiteContent {
  const hotline = (byKey.get('hotline') as string | undefined) || DEFAULT_SITE_CONTENT.hotline;
  const zaloLink = (byKey.get('zalo_link') as string | undefined) || DEFAULT_SITE_CONTENT.zaloLink;
  const heroBanner = byKey.get('hero_banner') as { url: string | null } | null | undefined;

  return {
    hotline,
    hotlineTel: hotline.replace(/\D/g, ''),
    zaloLink,
    zaloDisplay: zaloLink.replace(/^https?:\/\//, ''),
    address: (byKey.get('address') as string | undefined) || DEFAULT_SITE_CONTENT.address,
    openHours: (byKey.get('open_hours') as string | undefined) || DEFAULT_SITE_CONTENT.openHours,
    heroBannerUrl: heroBanner?.url ?? DEFAULT_SITE_CONTENT.heroBannerUrl,
  };
}

export async function getStorefrontSiteContent(): Promise<StorefrontSiteContent> {
  const rows = (await getJson<{ key: string; value: unknown }[]>('/api/v1/site-content')) ?? [];
  return deriveSiteContent(new Map(rows.map((r) => [r.key, r.value])));
}

// Dùng làm prop mặc định cho component nhận `siteContent` khi cha (vd app/account/layout.tsx) chưa
// tự fetch — tránh mỗi nơi phải tự suy ra hotlineTel/zaloDisplay từ DEFAULT_SITE_CONTENT thô.
export const DEFAULT_STOREFRONT_SITE_CONTENT: StorefrontSiteContent = deriveSiteContent(new Map());

export async function getStorefrontProducts({
  limit = 8,
  categoryId,
  occasionId,
}: { limit?: number; categoryId?: string; occasionId?: string } = {}): Promise<
  StorefrontProduct[]
> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (categoryId) query.set('categoryId', categoryId);
  if (occasionId) query.set('occasionId', occasionId);
  const result = await getJson<StorefrontProduct[]>(`/api/v1/products?${query}`);
  return result ?? [];
}
