'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountService } from './account.service';

export function useMe() {
  // retry: false — 401 ở đây thường chỉ là "chưa đăng nhập" (vd khách ghé trang chủ), không phải lỗi
  // tạm thời cần thử lại; tránh gọi /api/auth/refresh lặp lại vô ích cho khách vãng lai.
  return useQuery({ queryKey: ['account', 'me'], queryFn: accountService.getMe, retry: false });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountService.updateProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account', 'me'] }),
  });
}

export function useChangePassword() {
  return useMutation({ mutationFn: accountService.changePassword });
}

export function useSessions() {
  return useQuery({ queryKey: ['account', 'sessions'], queryFn: accountService.listSessions });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountService.revokeSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account', 'sessions'] }),
  });
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountService.revokeOtherSessions,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account', 'sessions'] }),
  });
}
