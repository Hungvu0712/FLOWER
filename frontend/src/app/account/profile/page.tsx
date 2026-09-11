'use client';

import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMe, useUpdateProfile, useChangePassword } from '@/features/core/account/account.hooks';
import { useUploadFile } from '@/features/core/files/files.hooks';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { FlowerIcon } from '@/components/ui/FlowerIcon';

const profileSchema = z.object({
  fullName: z.string().min(1, 'Vui lòng nhập họ tên'),
  phone: z.string().optional(),
});
type ProfileInput = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
});
type PasswordInput = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { data: me, isLoading } = useMe();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const uploadFile = useUploadFile();

  const profileForm = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    values: me ? { fullName: me.fullName, phone: me.phone ?? '' } : undefined,
  });
  const passwordForm = useForm<PasswordInput>({ resolver: zodResolver(passwordSchema) });

  if (isLoading || !me) return <p className="text-sm text-ink-muted">Đang tải...</p>;

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploaded = await uploadFile.mutateAsync({ file });
    updateProfile.mutate({ avatarFileId: uploaded.id });
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="rounded-3xl border border-border-soft bg-white p-8">
        <h1 className="font-display mb-6 text-2xl font-semibold text-ink">Hồ sơ</h1>

        <div className="mb-6 flex items-center gap-4">
          {me.avatarFile ? (
            <Image
              src={me.avatarFile.url}
              alt="Avatar"
              width={64}
              height={64}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-light">
              <FlowerIcon className="h-7 w-7" color="var(--color-rose)" />
            </div>
          )}
          <label className="cursor-pointer text-sm font-medium text-rose hover:text-rose-dark">
            {uploadFile.isPending ? 'Đang tải ảnh lên...' : 'Đổi avatar'}
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </label>
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={profileForm.handleSubmit((values) => updateProfile.mutate(values))}
        >
          <FormField label="Email" value={me.email} disabled />
          <FormField
            label="Họ tên"
            {...profileForm.register('fullName')}
            error={profileForm.formState.errors.fullName}
          />
          <FormField
            label="Số điện thoại"
            {...profileForm.register('phone')}
            error={profileForm.formState.errors.phone}
          />
          <Button type="submit" loading={updateProfile.isPending} className="self-start">
            Lưu thay đổi
          </Button>
        </form>
      </section>

      <section className="rounded-3xl border border-border-soft bg-white p-8">
        <h2 className="font-display mb-6 text-2xl font-semibold text-ink">Đổi mật khẩu</h2>
        <form
          className="flex flex-col gap-4"
          onSubmit={passwordForm.handleSubmit((values) => {
            changePassword.mutate(values, { onSuccess: () => passwordForm.reset() });
          })}
        >
          <FormField
            label="Mật khẩu hiện tại"
            type="password"
            {...passwordForm.register('currentPassword')}
            error={passwordForm.formState.errors.currentPassword}
          />
          <FormField
            label="Mật khẩu mới"
            type="password"
            {...passwordForm.register('newPassword')}
            error={passwordForm.formState.errors.newPassword}
          />
          <Button type="submit" loading={changePassword.isPending} className="self-start">
            Đổi mật khẩu
          </Button>
        </form>
      </section>
    </div>
  );
}
