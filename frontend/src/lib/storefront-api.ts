// Fetch DỮ LIỆU CÔNG KHAI cho các trang storefront (Server Component) — dùng `fetch` gốc của
// Next.js thay vì instance `axios` ở lib/axios.ts, vì instance đó gắn interceptor refresh-token/
// cookie trình duyệt (withCredentials), không hợp để gọi từ server lúc render trang. 2 endpoint này
// công khai (không cần đăng nhập) nên không cần cookie gì cả.

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  imageFile: { url: string } | null;
};

export type StorefrontProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  category: { id: string; name: string; slug: string } | null;
  images: { id: string; sortOrder: number; file: { id: string; url: string } }[];
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

// Không có endpoint GET /categories/:slug riêng ở backend — danh sách categories đủ nhỏ (chưa phân
// trang) nên tra bằng slug ngay trên kết quả list công khai, khỏi cần thêm endpoint mới.
export async function getStorefrontCategoryBySlug(slug: string): Promise<StorefrontCategory | null> {
  const categories = await getStorefrontCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}

export async function getStorefrontProducts({
  limit = 8,
  categoryId,
}: { limit?: number; categoryId?: string } = {}): Promise<StorefrontProduct[]> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (categoryId) query.set('categoryId', categoryId);
  const result = await getJson<StorefrontProduct[]>(`/api/v1/products?${query}`);
  return result ?? [];
}
