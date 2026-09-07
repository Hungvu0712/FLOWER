'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { permissionsService, type UpdatePermissionInput } from './permissions.service';
import { useToastStore } from '@/store/useToastStore';
import { getErrorMessage } from '@/lib/errors';

export function useAdminPermissions(params?: { assignable?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'permissions', params ?? null],
    queryFn: () => permissionsService.list(params),
  });
}

function useInvalidatePermissions() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['admin', 'permissions'] });
}

export function useCreatePermission() {
  const invalidate = useInvalidatePermissions();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: permissionsService.create,
    onSuccess: () => {
      invalidate();
      push('Đã tạo permission');
    },
    onError: (error) => push(getErrorMessage(error, 'Không tạo được permission'), 'error'),
  });
}

export function useUpdatePermission() {
  const invalidate = useInvalidatePermissions();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdatePermissionInput }) => permissionsService.update(id, input),
    onSuccess: () => {
      invalidate();
      push('Đã lưu thay đổi');
    },
    onError: (error) => push(getErrorMessage(error, 'Không lưu được thay đổi'), 'error'),
  });
}

export function useDeletePermission() {
  const invalidate = useInvalidatePermissions();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: permissionsService.remove,
    onSuccess: () => {
      invalidate();
      push('Đã xoá permission');
    },
    onError: (error) => push(getErrorMessage(error, 'Không xoá được permission'), 'error'),
  });
}
