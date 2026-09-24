'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { authService } from './auth.service';
import { useToastStore } from '@/store/useToastStore';
import { onSessionExpired } from '@/lib/axios';
import { isProtectedPath, loginUrlFor } from '@/lib/auth-routes';
import { hardRedirect } from '@/lib/navigation';
import { safeRedirectTarget } from '@/lib/redirect';
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

// Đích quay về sau đăng nhập, lấy từ ?redirectTo= mà proxy.ts gắn. Đọc qua useSearchParams() chứ KHÔNG
// qua window.location: khi điều hướng phía client (bấm Link), trang mới render TRƯỚC khi URL trên
// thanh địa chỉ đổi — window.location lúc đó vẫn là URL trang CŨ (không có ?redirectTo=), nên bật nhầm
// về '/' (docs/12 FE-08, tái hiện bằng log thật). Component gọi hook này phải nằm trong <Suspense> —
// Next.js yêu cầu vậy với useSearchParams() ở trang prerender tĩnh.
export function useRedirectTarget(): string {
  return safeRedirectTarget(useSearchParams().get('redirectTo'));
}

// Tải lại trang tại đích (hardRedirect, xem lib/navigation.ts) thay vì router.push — router.push từng kẹt
// người dùng ở /login vì Client Cache còn giữ redirect cũ (docs/12 FE-08). Trang mới tự fetch
// useMe() từ đầu nên không cần invalidate hay lưu user riêng (docs/12 FE-02: từng có useAuthStore trùng
// lặp với useMe()).
function useAfterAuthSuccess() {
  const target = useRedirectTarget();
  return () => hardRedirect(target);
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

// Mount 1 lần duy nhất ở Providers. Phiên chết hẳn (lib/axios.ts: /auth/refresh trả 401/403) → xoá user
// khỏi cache; nếu đang đứng ở route cần đăng nhập thì đưa về /login như proxy.ts sẽ làm.
// Trước đây không ai làm việc này: React Query GIỮ data cũ khi refetch lỗi, nên header vẫn hiện tên
// người dùng sau khi đã bị đá về /login — chỉ F5 mới hết (docs/12 FE-09).
export function useSessionExpiredHandler() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // usePathname(), KHÔNG window.location — cùng lý do như useRedirectTarget(): lúc điều hướng phía
  // client, window.location có thể vẫn là URL trang cũ, redirect theo nó sẽ ghi đè ?redirectTo đúng.
  const pathname = usePathname();

  useEffect(
    () =>
      onSessionExpired(() => {
        // setQueryData(null), KHÔNG removeQueries/clear(): gỡ query khỏi cache không báo cho component
        // ĐANG mount (Nav/UserMenu) render lại — chúng vẫn hiện user cũ.
        queryClient.setQueryData(['account', 'me'], null);
        // Phiên chết GIỮA CHỪNG khi đang đứng yên ở trang cần đăng nhập — không có điều hướng nào nên
        // proxy.ts không có cơ hội chặn; không redirect thì trang kẹt với dữ liệu lỗi/"Đang tải...".
        if (isProtectedPath(pathname)) router.replace(loginUrlFor(pathname));
      }),
    [queryClient, router, pathname],
  );
}
