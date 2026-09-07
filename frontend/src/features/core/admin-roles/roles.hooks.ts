'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rolesService, type UpdateRoleInput } from './roles.service';
import { useToastStore } from '@/store/useToastStore';
import { getErrorMessage } from '@/lib/errors';

export function useAdminRoles() {
  return useQuery({ queryKey: ['admin', 'roles'], queryFn: rolesService.list });
}

function useInvalidateRoles() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
}

export function useCreateRole() {
  const invalidate = useInvalidateRoles();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: rolesService.create,
    onSuccess: () => {
      invalidate();
      push('Đã tạo role');
    },
    onError: (error) => push(getErrorMessage(error, 'Không tạo được role'), 'error'),
  });
}

export function useUpdateRole() {
  const invalidate = useInvalidateRoles();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateRoleInput }) => rolesService.update(id, input),
    onSuccess: () => {
      invalidate();
      push('Đã lưu thay đổi');
    },
    onError: (error) => push(getErrorMessage(error, 'Không lưu được thay đổi'), 'error'),
  });
}

export function useDeleteRole() {
  const invalidate = useInvalidateRoles();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: rolesService.remove,
    onSuccess: () => {
      invalidate();
      push('Đã xoá role');
    },
    onError: (error) => push(getErrorMessage(error, 'Không xoá được role'), 'error'),
  });
}
