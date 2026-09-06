'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminUsersService } from './adminUsers.service';

export function useAdminUsers(params: { status?: string; role?: string; search?: string; page?: number }) {
  return useQuery({ queryKey: ['admin', 'users', params], queryFn: () => adminUsersService.list(params) });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
}

export function useBlockUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({ mutationFn: adminUsersService.block, onSuccess: invalidate });
}

export function useUnblockUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({ mutationFn: adminUsersService.unblock, onSuccess: invalidate });
}

export function useDeleteUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({ mutationFn: adminUsersService.remove, onSuccess: invalidate });
}

export function useResetUserPassword() {
  return useMutation({ mutationFn: adminUsersService.resetPassword });
}

export function useUpdateUserRole() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, roleCode }: { id: string; roleCode: string }) => adminUsersService.updateRole(id, roleCode),
    onSuccess: invalidate,
  });
}
