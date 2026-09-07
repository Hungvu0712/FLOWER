import { api } from '@/lib/axios';

export type LoginMethodSetting = {
  method: 'google_oauth' | 'email_password' | 'magic_link';
  isEnabled: boolean;
};

export const adminLoginMethodsService = {
  list: () => api.get<{ data: LoginMethodSetting[] }>('/api/v1/superadmin/login-methods').then((r) => r.data.data),

  update: (method: string, isEnabled: boolean) =>
    api.patch<{ data: LoginMethodSetting }>(`/api/v1/superadmin/login-methods/${method}`, { isEnabled }).then((r) => r.data.data),
};
