import { api } from '@/lib/axios';

export type Me = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarFile: { url: string } | null;
  roles: string[];
};

export type DeviceSession = {
  id: string;
  deviceName: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
};

export const accountService = {
  getMe: () => api.get<{ data: Me }>('/api/account/me').then((r) => r.data.data),

  updateProfile: (input: { fullName?: string; avatarFileId?: string | null; phone?: string | null }) =>
    api.patch<{ data: Me }>('/api/account/profile', input).then((r) => r.data.data),

  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    api.post('/api/account/change-password', input),

  listSessions: () => api.get<{ data: DeviceSession[] }>('/api/account/sessions').then((r) => r.data.data),

  revokeSession: (id: string) => api.delete(`/api/account/sessions/${id}`),

  revokeOtherSessions: () => api.delete('/api/account/sessions'),
};
