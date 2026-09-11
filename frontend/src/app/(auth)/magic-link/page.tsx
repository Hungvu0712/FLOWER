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
      <p className="text-sm text-ink-soft">
        Nếu email tồn tại, một liên kết đăng nhập (dùng 1 lần, hết hạn sau ít phút) đã được gửi tới
        hộp thư của bạn.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Đăng nhập bằng liên kết</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Chúng tôi sẽ gửi liên kết đăng nhập tới email của bạn
        </p>
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit((values) => requestMagicLink.mutate(values))}
      >
        <FormField label="Email" type="email" {...register('email')} error={errors.email} />
        <Button type="submit" loading={requestMagicLink.isPending}>
          Gửi liên kết
        </Button>
      </form>
    </div>
  );
}
