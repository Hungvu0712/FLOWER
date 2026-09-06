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
    return <p className="text-sm text-neutral-700">Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-neutral-900">Quên mật khẩu</h1>
      <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => forgotPassword.mutate(values))}>
        <FormField label="Email" type="email" {...register('email')} error={errors.email} />
        <Button type="submit" loading={forgotPassword.isPending}>Gửi hướng dẫn đặt lại mật khẩu</Button>
      </form>
    </div>
  );
}
