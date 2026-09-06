'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@/features/core/auth/auth.schemas';
import { useLogin, useLoginMethods } from '@/features/core/auth/auth.hooks';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

function isEnabled(methods: { method: string; isEnabled: boolean }[] | undefined, method: string) {
  // Trong lúc đang tải danh sách, mặc định hiện — tránh nháy ẩn/hiện; backend vẫn là nơi chặn thật.
  return methods ? methods.find((m) => m.method === method)?.isEnabled ?? false : true;
}

export default function LoginPage() {
  const { data: methods } = useLoginMethods();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-neutral-900">Đăng nhập</h1>

      {isEnabled(methods, 'email_password') && (
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => login.mutate(values))}>
          <FormField label="Email" type="email" {...register('email')} error={errors.email} />
          <FormField label="Mật khẩu" type="password" {...register('password')} error={errors.password} />
          {login.isError && <p className="text-xs text-red-600">Email hoặc mật khẩu không đúng.</p>}
          <Button type="submit" loading={login.isPending}>Đăng nhập</Button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {isEnabled(methods, 'magic_link') && (
          <Link href="/magic-link" className="text-center text-sm text-neutral-600 hover:underline">
            Đăng nhập bằng liên kết qua email (magic link)
          </Link>
        )}
        {isEnabled(methods, 'google_oauth') && (
          <Button type="button" variant="ghost" disabled title="Cấu hình NEXT_PUBLIC_GOOGLE_CLIENT_ID để bật">
            Đăng nhập với Google
          </Button>
        )}
      </div>

      <div className="flex justify-between text-xs text-neutral-500">
        <Link href="/forgot-password" className="hover:underline">Quên mật khẩu?</Link>
        <Link href="/register" className="hover:underline">Chưa có tài khoản? Đăng ký</Link>
      </div>
    </div>
  );
}
