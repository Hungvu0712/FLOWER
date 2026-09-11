'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authService } from './auth.service';
import { useToastStore } from '@/store/useToastStore';
import { getRedirectTarget } from '@/lib/redirect';
import type {
  LoginInput,
  RegisterInput,
  MagicLinkRequestInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.schemas';

// Mọi lời gọi API đi qua custom hook — component chỉ render, không biết axios/react-query tồn tại.
// Xem docs/04 §1.

export function useLoginMethods() {
  return useQuery({ queryKey: ['auth', 'login-methods'], queryFn: authService.getLoginMethods });
}

// Trước đây (docs/12 FE-02) còn ghi thêm user vào useAuthStore (Zustand) ở đây — 2 NGUỒN SỰ THẬT
// song song với useMe() (React Query), lệch nhau ngay khi hồ sơ đổi qua đường khác (đổi tên/avatar)
// mà không qua lại luồng đăng nhập. invalidateQueries bên dưới đã đủ để useMe() tự refetch — không
// cần lưu user riêng.
function useAfterAuthSuccess() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['account', 'me'] });
    router.push(getRedirectTarget());
  };
}

export function useLogin() {
  const onSuccess = useAfterAuthSuccess();
  return useMutation({
    mutationFn: (input: LoginInput) => authService.login(input),
    onSuccess,
  });
}

export function useRegister() {
  const router = useRouter();
  const push = useToastStore((s) => s.push);
  // Đăng ký KHÔNG tự động đăng nhập (backend không set cookie) — báo thành công rồi chuyển sang trang
  // login để người dùng tự đăng nhập lại.
  return useMutation({
    mutationFn: (input: RegisterInput) => authService.register(input),
    onSuccess: () => {
      push('Đăng ký thành công! Vui lòng đăng nhập.');
      router.push('/login');
    },
  });
}

export function useLoginWithGoogle() {
  const onSuccess = useAfterAuthSuccess();
  return useMutation({
    mutationFn: (idToken: string) => authService.loginWithGoogle(idToken),
    onSuccess,
  });
}

export function useRequestMagicLink() {
  return useMutation({
    mutationFn: (input: MagicLinkRequestInput) => authService.requestMagicLink(input),
  });
}

export function useVerifyMagicLink() {
  const onSuccess = useAfterAuthSuccess();
  return useMutation({
    mutationFn: (token: string) => authService.verifyMagicLink(token),
    onSuccess,
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) => authService.forgotPassword(input),
  });
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

  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      queryClient.clear(); // xoá luôn cache ['account', 'me'] — mọi nơi dùng useMe() tự hiện lại trạng thái chưa đăng nhập
      router.push('/login');
    },
  });
}
