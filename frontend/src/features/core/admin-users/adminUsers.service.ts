import { api } from '@/lib/axios';

export type AdminUserListItem = {
  id: string;
  fullName: string;
  email: string;
  status: 'active' | 'blocked';
  createdAt: string;
  roles: { role: { code: string; name: string } }[];
};

type PaginatedMeta = { page: number; limit: number; total: number; totalPages: number };

export const adminUsersService = {
  list: (params: { status?: string; role?: string; search?: string; page?: number }) =>
    api
      .get<{ data: AdminUserListItem[]; meta: PaginatedMeta }>('/api/v1/superadmin/users', {
        params,
      })
      .then((r) => ({ items: r.data.data, meta: r.data.meta })),

  block: (id: string) => api.patch(`/api/v1/superadmin/users/${id}/block`),
  unblock: (id: string) => api.patch(`/api/v1/superadmin/users/${id}/unblock`),
  remove: (id: string) => api.delete(`/api/v1/superadmin/users/${id}`),
  resetPassword: (id: string) => api.post(`/api/v1/superadmin/users/${id}/reset-password`),
  updateRole: (id: string, roleCode: string) =>
    api.patch(`/api/v1/superadmin/users/${id}/role`, { roleCode }),
};
