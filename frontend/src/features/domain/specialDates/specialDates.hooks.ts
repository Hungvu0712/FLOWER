'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { specialDatesService, type UpdateSpecialDateInput } from './specialDates.service';
import { useToastStore } from '@/store/useToastStore';
import { getErrorMessage } from '@/lib/errors';

export function useSpecialDates() {
  return useQuery({
    queryKey: ['account', 'special-dates'],
    queryFn: specialDatesService.list,
  });
}

function useInvalidateSpecialDates() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['account', 'special-dates'] });
}

export function useCreateSpecialDate() {
  const invalidate = useInvalidateSpecialDates();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: specialDatesService.create,
    onSuccess: () => {
      invalidate();
      push('Đã lưu ngày đặc biệt');
    },
    onError: (error) => push(getErrorMessage(error, 'Không lưu được'), 'error'),
  });
}

export function useUpdateSpecialDate() {
  const invalidate = useInvalidateSpecialDates();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSpecialDateInput }) =>
      specialDatesService.update(id, input),
    onSuccess: () => {
      invalidate();
      push('Đã lưu thay đổi');
    },
    onError: (error) => push(getErrorMessage(error, 'Không lưu được thay đổi'), 'error'),
  });
}

export function useDeleteSpecialDate() {
  const invalidate = useInvalidateSpecialDates();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: specialDatesService.remove,
    onSuccess: () => {
      invalidate();
      push('Đã xoá');
    },
    onError: (error) => push(getErrorMessage(error, 'Không xoá được'), 'error'),
  });
}
