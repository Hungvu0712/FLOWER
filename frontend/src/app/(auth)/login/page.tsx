'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@/features/core/auth/auth.schemas';
import { useLogin, useLoginMethods, useRedirectTarget } from '@/features/core/auth/auth.hooks';
import { GoogleLoginButton } from '@/features/core/auth/GoogleLoginButton';
import { useMe } from '@/features/core/account/account.hooks';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/errors';
import { hardRedirect } from '@/lib/navigation';

function isEnabled(methods: { method: string; isEnabled: boolean }[] | undefined, method: string) {
  // Trong lúc đang tải danh sách, mặc định hiện — tránh nháy ẩn/hiện; backend vẫn là nơi chặn thật.
  return methods ? (methods.find((m) => m.method === method)?.isEnabled ?? false) : true;
}

function LoginForm() {
  const redirectTarget = useRedirectTarget();
  const { data: me, isSuccess, isFetchedAfterMount, refetch: refetchMe } = useMe();
  const { data: methods } = useLoginMethods();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  // proxy.ts chặn theo token lúc điều hướng — nếu token đó vừa hết hạn thì bị đẩy về đây, nhưng ngay
  // sau đó có thể tự refresh ngầm thành công (vẫn còn refresh token hợp lệ). Không có 2 effect này thì
  // người dùng bị kẹt ở trang login dù thực chất đã đăng nhập lại.
  // refetch() CỐ Ý bỏ qua staleTime (30s) của useMe() — luôn gọi API thật, đi qua đúng luồng
  // refresh-token thật sự.
  useEffect(() => {
    refetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chỉ điều hướng khi có kết quả /account/me MỚI — fetch thành công SAU khi trang này mount. KHÔNG tin
  // `me` còn trong cache: bị đá về đây do hết phiên thì cache vẫn giữ user cũ (React Query giữ data khi
  // refetch lỗi) — từng điều hướng ngay theo dữ liệu đó dù phiên đã chết, cộng với đọc nhầm redirectTo
  // nên văng về trang chủ với header vẫn hiện tên người dùng (docs/12 FE-08, FE-09).
  // hardRedirect thay vì router.replace: xem lib/navigation.ts. Mutation đăng nhập (useLogin) cũng
  // điều hướng tới CÙNG đích này — gọi trùng vô hại.
  const hasFreshSession = Boolean(me) && isSuccess && isFetchedAfterMount;
  useEffect(() => {
    if (hasFreshSession) hardRedirect(redirectTarget);
  }, [hasFreshSession, redirectTarget]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Chào mừng trở lại</h1>
        <p className="mt-1 text-sm text-ink-muted">Đăng nhập để tiếp tục đặt hoa</p>
      </div>

      {isEnabled(methods, 'email_password') && (
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((values) => login.mutate(values))}
        >
          <FormField label="Email" type="email" {...register('email')} error={errors.email} />
          <FormField
            label="Mật khẩu"
            type="password"
            {...register('password')}
            error={errors.password}
          />
          {login.isError && (
            <p className="text-xs text-red-600">
              {getErrorMessage(login.error, 'Email hoặc mật khẩu không đúng.')}
            </p>
          )}
          <Button type="submit" loading={login.isPending}>
            Đăng nhập
          </Button>
        </form>
      )}

      {(isEnabled(methods, 'magic_link') || isEnabled(methods, 'google_oauth')) && (
        <div className="flex items-center gap-3 text-xs text-ink-muted">
          <div className="h-px flex-1 bg-border" />
          hoặc
          <div className="h-px flex-1 bg-border" />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {isEnabled(methods, 'magic_link') && (
          <Link href="/magic-link">
            <Button type="button" variant="outline" className="w-full">
              Đăng nhập bằng liên kết qua email
            </Button>
          </Link>
        )}
        {isEnabled(methods, 'google_oauth') && <GoogleLoginButton />}
      </div>

      <div className="flex justify-between text-xs text-ink-muted">
        <Link href="/forgot-password" className="hover:text-rose">
          Quên mật khẩu?
        </Link>
        <Link href="/register" className="hover:text-rose">
          Chưa có tài khoản? Đăng ký
        </Link>
      </div>
    </div>
  );
}

// useRedirectTarget() dùng useSearchParams() — Next.js bắt buộc bọc <Suspense> (thiếu là `next build`
// lỗi), giống magic-link/verify và reset-password.
export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-soft">Đang tải...</p>}>
      <LoginForm />
    </Suspense>
  );
}
