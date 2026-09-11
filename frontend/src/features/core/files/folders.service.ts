import { api } from '@/lib/axios';

export type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  createdBy: string | null;
  createdAt: string;
  _count: { folders: number; files: number };
};

export type CreateFolderInput = { name: string; parentId?: string | null };
export type UpdateFolderInput = { name?: string; parentId?: string | null };

export const foldersService = {
  // Bỏ trống parentId = cấp gốc — cây tải dần từng cấp (lazy-load), không tải hết cây cùng lúc.
  list: (parentId?: string) =>
    api
      .get<{ data: Folder[] }>('/api/v1/folders', { params: { parentId } })
      .then((r) => r.data.data),

  create: (input: CreateFolderInput) =>
    api.post<{ data: Folder }>('/api/v1/folders', input).then((r) => r.data.data),

  update: (id: string, input: UpdateFolderInput) =>
    api.patch<{ data: Folder }>(`/api/v1/folders/${id}`, input).then((r) => r.data.data),

  remove: (id: string) => api.delete(`/api/v1/folders/${id}`),
};
