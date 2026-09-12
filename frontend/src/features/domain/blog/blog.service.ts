import { api } from '@/lib/axios';

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; fullName: string } | null;
  thumbnailFile: { id: string; url: string } | null;
};

export type CreateBlogPostInput = {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  thumbnailFileId?: string | null;
  publishedAt?: string | null;
};
export type UpdateBlogPostInput = Partial<CreateBlogPostInput>;

export type PaginationMeta = { page: number; limit: number; total: number; totalPages: number };

export const blogService = {
  // Công khai — storefront /blog, chỉ bài đã xuất bản.
  listPublic: (params?: { page?: number; limit?: number }) =>
    api
      .get<{ data: BlogPost[]; meta: PaginationMeta }>('/api/v1/blog', { params })
      .then((r) => r.data),

  getPublicBySlug: (slug: string) =>
    api.get<{ data: BlogPost }>(`/api/v1/blog/${slug}`).then((r) => r.data.data),

  listAdmin: (params?: { page?: number; limit?: number }) =>
    api
      .get<{ data: BlogPost[]; meta: PaginationMeta }>('/api/v1/admin/blog', { params })
      .then((r) => r.data),

  create: (input: CreateBlogPostInput) => api.post('/api/v1/admin/blog', input),

  update: (id: string, input: UpdateBlogPostInput) => api.patch(`/api/v1/admin/blog/${id}`, input),

  remove: (id: string) => api.delete(`/api/v1/admin/blog/${id}`),
};
