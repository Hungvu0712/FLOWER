import { api } from '@/lib/axios';

export type Address = {
  id: string;
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  ward: string | null;
  district: string | null;
  city: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateAddressInput = {
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  ward?: string;
  district?: string;
  city?: string;
  isDefault?: boolean;
};
export type UpdateAddressInput = Partial<CreateAddressInput>;

export const addressesService = {
  list: () => api.get<{ data: Address[] }>('/api/v1/account/addresses').then((r) => r.data.data),

  create: (input: CreateAddressInput) => api.post('/api/v1/account/addresses', input),

  update: (id: string, input: UpdateAddressInput) =>
    api.patch(`/api/v1/account/addresses/${id}`, input),

  remove: (id: string) => api.delete(`/api/v1/account/addresses/${id}`),
};
