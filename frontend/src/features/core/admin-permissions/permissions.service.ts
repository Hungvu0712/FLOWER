import { api } from '@/lib/axios';

export type Permission = {
  id: number;
  code: string;
  groupName: string;
  description: string | null;
  isSystem: boolean;
  isRestricted: boolean;
};

export type CreatePermissionInput = { code: string; groupName: string; description?: string };
export type UpdatePermissionInput = { code?: string; groupName?: string; description?: string };

export const permissionsService = {
  // assignable: true — loại bỏ permission is_restricted (dùng cho picker gán role tuỳ chỉnh).
  list: (params?: { assignable?: boolean }) =>
    api.get<{ data: Permission[] }>('/api/v1/superadmin/permissions', { params }).then((r) => r.data.data),

  create: (input: CreatePermissionInput) => api.post('/api/v1/superadmin/permissions', input),

  update: (id: number, input: UpdatePermissionInput) => api.patch(`/api/v1/superadmin/permissions/${id}`, input),

  remove: (id: number) => api.delete(`/api/v1/superadmin/permissions/${id}`),
};
