'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminUsersService } from './adminUsers.service';
import { useToastStore } from '@/store/useToastStore';
import { getErrorMessage } from '@/lib/errors';

export function useAdminUsers(params: {
  status?: string;
  role?: string;
  search?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => adminUsersService.list(params),
  });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
}

export function useBlockUser() {
  const invalidate = useInvalidateUsers();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: adminUsersService.block,
    onSuccess: () => {
      invalidate();
      push('Đã khoá tài khoản');
    },
    onError: (error) => push(getErrorMessage(error, 'Không khoá được tài khoản'), 'error'),
  });
}

export function useUnblockUser() {
  const invalidate = useInvalidateUsers();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: adminUsersService.unblock,
    onSuccess: () => {
      invalidate();
      push('Đã mở khoá tài khoản');
    },
    onError: (error) => push(getErrorMessage(error, 'Không mở khoá được tài khoản'), 'error'),
  });
}

export function useDeleteUser() {
  const invalidate = useInvalidateUsers();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: adminUsersService.remove,
    onSuccess: () => {
      invalidate();
      push('Đã xoá tài khoản');
    },
    onError: (error) => push(getErrorMessage(error, 'Không xoá được tài khoản'), 'error'),
  });
}

export function useResetUserPassword() {
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: adminUsersService.resetPassword,
    onSuccess: () => push('Đã gửi mật khẩu mới qua email'),
    onError: (error) => push(getErrorMessage(error, 'Không đặt lại được mật khẩu'), 'error'),
  });
}

export function useUpdateUserRole() {
  const invalidate = useInvalidateUsers();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ id, roleCode }: { id: string; roleCode: string }) =>
      adminUsersService.updateRole(id, roleCode),
    onSuccess: () => {
      invalidate();
      push('Đã cập nhật role');
    },
    onError: (error) => push(getErrorMessage(error, 'Không cập nhật được role'), 'error'),
  });
}
