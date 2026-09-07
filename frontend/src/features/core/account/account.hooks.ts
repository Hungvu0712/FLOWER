'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountService } from './account.service';
import { useToastStore } from '@/store/useToastStore';
import { getErrorMessage } from '@/lib/errors';

export function useMe() {
  // retry: false — 401 ở đây thường chỉ là "chưa đăng nhập" (vd khách ghé trang chủ), không phải lỗi
  // tạm thời cần thử lại; tránh gọi /api/v1/auth/refresh lặp lại vô ích cho khách vãng lai.
  return useQuery({ queryKey: ['account', 'me'], queryFn: accountService.getMe, retry: false });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: accountService.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', 'me'] });
      push('Đã lưu thay đổi');
    },
    onError: (error) => push(getErrorMessage(error, 'Không lưu được thay đổi'), 'error'),
  });
}

export function useChangePassword() {
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: accountService.changePassword,
    onSuccess: () => push('Đổi mật khẩu thành công'),
    onError: (error) => push(getErrorMessage(error, 'Không đổi được mật khẩu'), 'error'),
  });
}

export function useSessions() {
  return useQuery({ queryKey: ['account', 'sessions'], queryFn: accountService.listSessions });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: accountService.revokeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', 'sessions'] });
      push('Đã đăng xuất thiết bị');
    },
    onError: (error) => push(getErrorMessage(error, 'Không đăng xuất được thiết bị'), 'error'),
  });
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: accountService.revokeOtherSessions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', 'sessions'] });
      push('Đã đăng xuất các thiết bị khác');
    },
    onError: (error) => push(getErrorMessage(error, 'Không đăng xuất được các thiết bị khác'), 'error'),
  });
}
