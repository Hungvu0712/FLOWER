import { api } from '@/lib/axios';

export type AdminUserListItem = {
  id: string;
  fullName: string;
  email: string;
  status: 'active' | 'blocked';
  createdAt: string;
  roles: { role: { code: string; name: string } }[];
};

export const adminUsersService = {
  list: (params: { status?: string; role?: string; search?: string; page?: number }) =>
    api
      .get<{ data: { items: AdminUserListItem[]; total: number } }>('/api/superadmin/users', { params })
      .then((r) => r.data.data),

  block: (id: string) => api.patch(`/api/superadmin/users/${id}/block`),
  unblock: (id: string) => api.patch(`/api/superadmin/users/${id}/unblock`),
  remove: (id: string) => api.delete(`/api/superadmin/users/${id}`),
  resetPassword: (id: string) => api.post(`/api/superadmin/users/${id}/reset-password`),
  updateRole: (id: string, roleCode: string) => api.patch(`/api/superadmin/users/${id}/role`, { roleCode }),
};
