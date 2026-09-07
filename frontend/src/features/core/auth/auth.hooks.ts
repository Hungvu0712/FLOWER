'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authService } from './auth.service';
import { useAuthStore } from '@/store/useAuthStore';
import type {
  LoginInput,
  RegisterInput,
  MagicLinkRequestInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.schemas';

// Mọi lời gọi API đi qua custom hook — component chỉ render, không biết axios/react-query tồn tại.
// Xem ARCHITECTURE.md §13.2.

export function useLoginMethods() {
  return useQuery({ queryKey: ['auth', 'login-methods'], queryFn: authService.getLoginMethods });
}

function useAfterAuthSuccess() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return (user: { id: string; fullName: string; email: string; roles?: string[] }) => {
    setUser({ ...user, roles: user.roles || [] });
    queryClient.invalidateQueries({ queryKey: ['account', 'me'] });
    router.push('/');
  };
}

export function useLogin() {
  const onSuccess = useAfterAuthSuccess();
  return useMutation({
    mutationFn: (input: LoginInput) => authService.login(input),
    onSuccess: (data) => onSuccess(data.user),
  });
}

export function useRegister() {
  const onSuccess = useAfterAuthSuccess();
  return useMutation({
    mutationFn: (input: RegisterInput) => authService.register(input),
    onSuccess: (data) => onSuccess(data.user),
  });
}

export function useRequestMagicLink() {
  return useMutation({ mutationFn: (input: MagicLinkRequestInput) => authService.requestMagicLink(input) });
}

export function useVerifyMagicLink() {
  const onSuccess = useAfterAuthSuccess();
  return useMutation({
    mutationFn: (token: string) => authService.verifyMagicLink(token),
    onSuccess: (data) => onSuccess(data.user),
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: (input: ForgotPasswordInput) => authService.forgotPassword(input) });
}

export function useResetPassword() {
  const router = useRouter();
  return useMutation({
    mutationFn: ({ token, input }: { token: string; input: ResetPasswordInput }) =>
      authService.resetPassword(token, input),
    onSuccess: () => router.push('/login'),
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      setUser(null);
      queryClient.clear();
      router.push('/login');
    },
  });
}
