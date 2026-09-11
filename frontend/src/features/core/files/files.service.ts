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

type PresignResponse = {
  uploadUrl: string;
  publicId: string;
  timestamp: number;
  signature: string;
  apiKey: string;
  allowedFormats: string;
};

export const filesService = {
  // Bước 1: backend ký tham số upload (publicId/timestamp/signature) — bước 2: POST thẳng file lên
  // Cloudinary (không qua server Express) — bước 3: báo backend lưu metadata. Xem docs/02 §6.
  async upload(file: File, folderId?: string | null): Promise<FileRecord> {
    const presign = await api
      .post<{ data: PresignResponse }>('/api/v1/files/presign', {
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        folderId: folderId ?? null,
      })
      .then((r) => r.data.data);

    // Dùng axios thuần (không qua instance `api`) — Cloudinary là host khác, không được gửi kèm
    // cookie. Cloudinary nhận multipart form (khác PUT nhị phân thuần của R2/S3).
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', presign.apiKey);
    form.append('timestamp', String(presign.timestamp));
    form.append('signature', presign.signature);
    form.append('public_id', presign.publicId);
    form.append('allowed_formats', presign.allowedFormats);
    const uploadResult = await axios
      .post<{ public_id: string }>(presign.uploadUrl, form)
      .then((r) => r.data);

    return api
      .post<{ data: FileRecord }>('/api/v1/files', {
        publicId: uploadResult.public_id,
        originalName: file.name,
        folderId: folderId ?? null,
      })
      .then((r) => r.data.data);
  },

  list: (folderId?: string, view: 'grid' | 'list' = 'grid') =>
    api
      .get<{ data: FileRecord[]; meta: unknown }>('/api/v1/files', { params: { folderId, view } })
      .then((r) => r.data),

  remove: (id: string) => api.delete(`/api/v1/files/${id}`),
};
