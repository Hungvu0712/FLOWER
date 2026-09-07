import axios from 'axios';
import { api } from '@/lib/axios';

export type FileRecord = {
  id: string;
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  folderId: string | null;
  createdAt: string;
};

export const filesService = {
  // Bước 1: backend cấp presigned URL — bước 2: PUT thẳng file lên R2 (không qua server Express) —
  // bước 3: báo backend lưu metadata. Xem ARCHITECTURE.md §8.
  async upload(file: File, folderId?: string | null): Promise<FileRecord> {
    const presign = await api
      .post<{ data: { uploadUrl: string; r2Key: string } }>('/api/v1/files/presign', {
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        folderId: folderId ?? null,
      })
      .then((r) => r.data.data);

    // Dùng axios thuần (không qua instance `api`) — R2 là host khác, không được gửi kèm cookie.
    await axios.put(presign.uploadUrl, file, { headers: { 'Content-Type': file.type } });

    return api
      .post<{ data: FileRecord }>('/api/v1/files', {
        r2Key: presign.r2Key,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        folderId: folderId ?? null,
      })
      .then((r) => r.data.data);
  },

  list: (folderId?: string, view: 'grid' | 'list' = 'grid') =>
    api.get<{ data: FileRecord[]; meta: unknown }>('/api/v1/files', { params: { folderId, view } }).then((r) => r.data),

  remove: (id: string) => api.delete(`/api/v1/files/${id}`),
};
