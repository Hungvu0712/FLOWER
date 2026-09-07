'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterInput } from '@/features/core/auth/auth.schemas';
import { useRegister } from '@/features/core/auth/auth.hooks';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

export default function RegisterPage() {
  const registerMutation = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Tạo tài khoản</h1>
        <p className="mt-1 text-sm text-ink-muted">Đăng ký để lưu đơn hàng và nhắc lịch đặc biệt</p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => registerMutation.mutate(values))}>
        <FormField label="Họ tên" {...register('fullName')} error={errors.fullName} />
        <FormField label="Email" type="email" {...register('email')} error={errors.email} />
        <FormField label="Mật khẩu" type="password" {...register('password')} error={errors.password} />
        {registerMutation.isError && (
          <p className="text-xs text-red-600">Email đã được sử dụng hoặc có lỗi xảy ra.</p>
        )}
        <Button type="submit" loading={registerMutation.isPending}>Tạo tài khoản</Button>
      </form>

      <Link href="/login" className="text-center text-xs text-ink-muted hover:text-rose">
        Đã có tài khoản? Đăng nhập
      </Link>
    </div>
  );
}
