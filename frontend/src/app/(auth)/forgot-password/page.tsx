'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, ForgotPasswordInput } from '@/features/core/auth/auth.schemas';
import { useForgotPassword } from '@/features/core/auth/auth.hooks';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  if (forgotPassword.isSuccess) {
    return <p className="text-sm text-ink-soft">Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Quên mật khẩu</h1>
        <p className="mt-1 text-sm text-ink-muted">Nhập email để nhận hướng dẫn đặt lại mật khẩu</p>
      </div>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => forgotPassword.mutate(values))}>
        <FormField label="Email" type="email" {...register('email')} error={errors.email} />
        <Button type="submit" loading={forgotPassword.isPending}>Gửi hướng dẫn</Button>
      </form>
    </div>
  );
}
