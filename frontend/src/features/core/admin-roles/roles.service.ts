import { api } from '@/lib/axios';
import type { Permission } from '../admin-permissions/permissions.service';

export type RoleListItem = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: { permission: Permission }[];
  _count: { users: number };
};

export type CreateRoleInput = { code: string; name: string; description?: string; permissionIds: number[] };
export type UpdateRoleInput = { name?: string; description?: string; permissionIds?: number[] };

export const rolesService = {
  list: () => api.get<{ data: RoleListItem[] }>('/api/v1/superadmin/roles').then((r) => r.data.data),

  create: (input: CreateRoleInput) => api.post('/api/v1/superadmin/roles', input),

  update: (id: number, input: UpdateRoleInput) => api.patch(`/api/v1/superadmin/roles/${id}`, input),

  remove: (id: number) => api.delete(`/api/v1/superadmin/roles/${id}`),
};
