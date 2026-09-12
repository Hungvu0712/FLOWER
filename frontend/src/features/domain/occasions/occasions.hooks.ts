'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { occasionsService, type UpdateOccasionInput } from './occasions.service';
import { useToastStore } from '@/store/useToastStore';
import { getErrorMessage } from '@/lib/errors';

export function useOccasions(params?: { includeInactive?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'occasions', params ?? null],
    queryFn: () => occasionsService.list(params),
  });
}

function useInvalidateOccasions() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['admin', 'occasions'] });
}

export function useCreateOccasion() {
  const invalidate = useInvalidateOccasions();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: occasionsService.create,
    onSuccess: () => {
      invalidate();
      push('Đã tạo dịp lễ');
    },
    onError: (error) => push(getErrorMessage(error, 'Không tạo được dịp lễ'), 'error'),
  });
}

export function useUpdateOccasion() {
  const invalidate = useInvalidateOccasions();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateOccasionInput }) =>
      occasionsService.update(id, input),
    onSuccess: () => {
      invalidate();
      push('Đã lưu thay đổi');
    },
    onError: (error) => push(getErrorMessage(error, 'Không lưu được thay đổi'), 'error'),
  });
}

export function useDeleteOccasion() {
  const invalidate = useInvalidateOccasions();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: occasionsService.remove,
    onSuccess: () => {
      invalidate();
      push('Đã xoá dịp lễ');
    },
    onError: (error) => push(getErrorMessage(error, 'Không xoá được dịp lễ'), 'error'),
  });
}
