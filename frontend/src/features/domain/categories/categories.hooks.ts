'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriesService, type UpdateCategoryInput } from './categories.service';
import { useToastStore } from '@/store/useToastStore';
import { getErrorMessage } from '@/lib/errors';

export function useCategories(params?: { includeInactive?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'categories', params ?? null],
    queryFn: () => categoriesService.list(params),
  });
}

function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
}

export function useCreateCategory() {
  const invalidate = useInvalidateCategories();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: categoriesService.create,
    onSuccess: () => {
      invalidate();
      push('Đã tạo danh mục');
    },
    onError: (error) => push(getErrorMessage(error, 'Không tạo được danh mục'), 'error'),
  });
}

export function useUpdateCategory() {
  const invalidate = useInvalidateCategories();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) => categoriesService.update(id, input),
    onSuccess: () => {
      invalidate();
      push('Đã lưu thay đổi');
    },
    onError: (error) => push(getErrorMessage(error, 'Không lưu được thay đổi'), 'error'),
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateCategories();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: categoriesService.remove,
    onSuccess: () => {
      invalidate();
      push('Đã xoá danh mục');
    },
    onError: (error) => push(getErrorMessage(error, 'Không xoá được danh mục'), 'error'),
  });
}
