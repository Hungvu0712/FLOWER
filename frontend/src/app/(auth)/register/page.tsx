'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterInput } from '@/features/core/auth/auth.schemas';
import { useRegister } from '@/features/core/auth/auth.hooks';
import { useMe } from '@/features/core/account/account.hooks';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/errors';
import { getRedirectTarget } from '@/lib/redirect';

export default function RegisterPage() {
  const router = useRouter();
  const { data: me, refetch: refetchMe } = useMe();
  const registerMutation = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  // Xem giải thích ở login/page.tsx — refetch() cố ý bỏ qua cache/staleTime để tránh vòng lặp redirect
  // khi dữ liệu cache còn "tươi" nhưng cookie thật đã hết hạn.
  useEffect(() => {
    refetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (me) router.replace(getRedirectTarget());
  }, [me, router]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Tạo tài khoản</h1>
        <p className="mt-1 text-sm text-ink-muted">Đăng ký để lưu đơn hàng và nhắc lịch đặc biệt</p>
      </div>

      <form
        className="flex flex-col gap-4"
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
