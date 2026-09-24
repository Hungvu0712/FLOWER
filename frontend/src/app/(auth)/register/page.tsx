'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterInput } from '@/features/core/auth/auth.schemas';
import { useRedirectTarget, useRegister } from '@/features/core/auth/auth.hooks';
import { useMe } from '@/features/core/account/account.hooks';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/errors';
import { hardRedirect } from '@/lib/navigation';

function RegisterForm() {
  const redirectTarget = useRedirectTarget();
  const { data: me, isSuccess, isFetchedAfterMount, refetch: refetchMe } = useMe();
  const registerMutation = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  // Xem giải thích ở login/page.tsx — chỉ rời trang khi có kết quả /account/me MỚI fetch sau khi mount,
  // không tin user cũ còn trong cache (docs/12 FE-08, FE-09).
  useEffect(() => {
    refetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasFreshSession = Boolean(me) && isSuccess && isFetchedAfterMount;
  useEffect(() => {
    if (hasFreshSession) hardRedirect(redirectTarget);
  }, [hasFreshSession, redirectTarget]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Tạo tài khoản</h1>
        <p className="mt-1 text-sm text-ink-muted">Đăng ký để lưu đơn hàng và nhắc lịch đặc biệt</p>
      </div>

      <form
        className="flex flex-col gap-4"
        // noValidate — input email dùng type="email", thiếu cờ này thì validate NGUYÊN SINH của trình
        // duyệt chặn sự kiện submit TRƯỚC KHI react-hook-form chạy tới, hiện tooltip mặc định của trình
        // duyệt (không tiếng Việt, không đồng bộ style) thay vì thông báo "Email không hợp lệ" từ zod —
        // bug thật, lộ ra lần đầu khi test E2E thật sự bấm được nút submit (trước đó bấm nhầm nút do
        // sai selector, chưa từng chạm tới luồng này).
        noValidate
        onSubmit={handleSubmit((values) => registerMutation.mutate(values))}
      >
        <FormField label="Họ tên" {...register('fullName')} error={errors.fullName} />
        <FormField label="Email" type="email" {...register('email')} error={errors.email} />
        <FormField
          label="Mật khẩu"
          type="password"
          {...register('password')}
          error={errors.password}
        />
        {registerMutation.isError && (
          <p className="text-xs text-red-600">
            {getErrorMessage(registerMutation.error, 'Email đã được sử dụng hoặc có lỗi xảy ra.')}
          </p>
        )}
        <Button type="submit" loading={registerMutation.isPending}>
          Tạo tài khoản
        </Button>
      </form>

      <Link href="/login" className="text-center text-xs text-ink-muted hover:text-rose">
        Đã có tài khoản? Đăng nhập
      </Link>
    </div>
  );
}

// useRedirectTarget() dùng useSearchParams() — bắt buộc bọc <Suspense>, xem login/page.tsx.
export default function RegisterPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-soft">Đang tải...</p>}>
      <RegisterForm />
    </Suspense>
  );
}
