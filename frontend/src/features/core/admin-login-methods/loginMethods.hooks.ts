'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminLoginMethodsService } from './loginMethods.service';
import { useToastStore } from '@/store/useToastStore';
import { getErrorMessage } from '@/lib/errors';

export function useAdminLoginMethods() {
  return useQuery({ queryKey: ['admin', 'login-methods'], queryFn: adminLoginMethodsService.list });
}

export function useUpdateLoginMethod() {
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ method, isEnabled }: { method: string; isEnabled: boolean }) =>
      adminLoginMethodsService.update(method, isEnabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'login-methods'] });
      push('Đã cập nhật phương thức đăng nhập');
    },
    onError: (error) =>
      push(getErrorMessage(error, 'Không cập nhật được phương thức đăng nhập'), 'error'),
  });
}
