'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, ResetPasswordInput } from '@/features/core/auth/auth.schemas';
import { useResetPassword } from '@/features/core/auth/auth.hooks';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

function ResetPasswordInner() {
  const token = useSearchParams().get('token');
  const resetPassword = useResetPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  if (!token) return <p className="text-sm text-red-600">Thiếu token trong liên kết.</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Đặt lại mật khẩu</h1>
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit((values) => resetPassword.mutate({ token, input: values }))}
      >
        <FormField label="Mật khẩu mới" type="password" {...register('newPassword')} error={errors.newPassword} />
        {resetPassword.isError && <p className="text-xs text-red-600">Liên kết không hợp lệ hoặc đã hết hạn.</p>}
        <Button type="submit" loading={resetPassword.isPending}>Đặt lại mật khẩu</Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-soft">Đang tải...</p>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
