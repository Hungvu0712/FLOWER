'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminLoginMethodsService } from './loginMethods.service';

export function useAdminLoginMethods() {
  return useQuery({ queryKey: ['admin', 'login-methods'], queryFn: adminLoginMethodsService.list });
}

export function useUpdateLoginMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ method, isEnabled }: { method: string; isEnabled: boolean }) =>
      adminLoginMethodsService.update(method, isEnabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'login-methods'] }),
  });
}
