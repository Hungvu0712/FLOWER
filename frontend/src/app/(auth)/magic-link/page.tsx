'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { magicLinkRequestSchema, MagicLinkRequestInput } from '@/features/core/auth/auth.schemas';
import { useRequestMagicLink } from '@/features/core/auth/auth.hooks';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

export default function MagicLinkRequestPage() {
  const requestMagicLink = useRequestMagicLink();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MagicLinkRequestInput>({ resolver: zodResolver(magicLinkRequestSchema) });

  if (requestMagicLink.isSuccess) {
    return (
      <p className="text-sm text-neutral-700">
        Nếu email tồn tại, một liên kết đăng nhập (dùng 1 lần, hết hạn sau ít phút) đã được gửi tới hộp thư của bạn.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-neutral-900">Đăng nhập bằng magic link</h1>
      <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => requestMagicLink.mutate(values))}>
        <FormField label="Email" type="email" {...register('email')} error={errors.email} />
        <Button type="submit" loading={requestMagicLink.isPending}>Gửi liên kết</Button>
      </form>
    </div>
  );
}
