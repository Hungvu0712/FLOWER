import { api } from '@/lib/axios';

export type WishlistItem = {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  images: { file: { url: string } }[];
  savedAt: string;
};

export const wishlistService = {
  list: () =>
    api.get<{ data: WishlistItem[] }>('/api/v1/account/wishlist').then((r) => r.data.data),

  add: (productId: string) => api.post('/api/v1/account/wishlist', { productId }),

  remove: (productId: string) => api.delete(`/api/v1/account/wishlist/${productId}`),
};
