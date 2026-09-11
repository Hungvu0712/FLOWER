'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productsService, type UpdateProductInput } from './products.service';
import { useToastStore } from '@/store/useToastStore';
import { getErrorMessage } from '@/lib/errors';

export function useProducts(params?: {
  includeInactive?: boolean;
  categoryId?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['admin', 'products', params ?? null],
    queryFn: () => productsService.list(params),
  });
}

function useInvalidateProducts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
}

export function useCreateProduct() {
  const invalidate = useInvalidateProducts();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: productsService.create,
    onSuccess: () => {
      invalidate();
      push('Đã tạo sản phẩm');
    },
    onError: (error) => push(getErrorMessage(error, 'Không tạo được sản phẩm'), 'error'),
  });
}

export function useUpdateProduct() {
  const invalidate = useInvalidateProducts();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductInput }) =>
      productsService.update(id, input),
    onSuccess: () => {
      invalidate();
      push('Đã lưu thay đổi');
    },
    onError: (error) => push(getErrorMessage(error, 'Không lưu được thay đổi'), 'error'),
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidateProducts();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: productsService.remove,
    onSuccess: () => {
      invalidate();
      push('Đã xoá sản phẩm');
    },
    onError: (error) => push(getErrorMessage(error, 'Không xoá được sản phẩm'), 'error'),
  });
}
