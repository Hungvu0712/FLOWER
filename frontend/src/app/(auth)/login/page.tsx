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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Chào mừng trở lại</h1>
        <p className="mt-1 text-sm text-ink-muted">Đăng nhập để tiếp tục đặt hoa</p>
      </div>

      {isEnabled(methods, 'email_password') && (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => login.mutate(values))}>
          <FormField label="Email" type="email" {...register('email')} error={errors.email} />
          <FormField label="Mật khẩu" type="password" {...register('password')} error={errors.password} />
          {login.isError && <p className="text-xs text-red-600">Email hoặc mật khẩu không đúng.</p>}
          <Button type="submit" loading={login.isPending}>Đăng nhập</Button>
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
            <Button type="button" variant="outline" className="w-full">Đăng nhập bằng liên kết qua email</Button>
          </Link>
        )}
        {isEnabled(methods, 'google_oauth') && (
          <Button type="button" variant="outline" className="w-full" disabled title="Cấu hình NEXT_PUBLIC_GOOGLE_CLIENT_ID để bật">
            Đăng nhập với Google
          </Button>
        )}
      </div>

      <div className="flex justify-between text-xs text-ink-muted">
        <Link href="/forgot-password" className="hover:text-rose">Quên mật khẩu?</Link>
        <Link href="/register" className="hover:text-rose">Chưa có tài khoản? Đăng ký</Link>
      </div>
    </div>
  );
}
