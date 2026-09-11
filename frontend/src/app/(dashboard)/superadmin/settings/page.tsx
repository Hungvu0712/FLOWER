'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  useSystemSettings,
  useUpdateSystemSetting,
} from '@/features/core/admin-settings/systemSettings.hooks';
import { useUploadFile } from '@/features/core/files/files.hooks';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { FlowerIcon } from '@/components/ui/FlowerIcon';

type SiteLogoValue = { fileId: string; url: string } | null;

// docs/12, Phase 4 — bảng key-value tổng quát. Chỉ 4 key có ý nghĩa thật hiện tại (xem
// backend/.../systemSettings.validation.ts) — CHƯA có maintenance_mode (cần middleware chặn toàn
// site + lối thoát riêng cho super_admin, rủi ro cao hơn phần còn lại, để sau).
export default function SystemSettingsPage() {
  const { data: settings, isLoading } = useSystemSettings();
  const update = useUpdateSystemSetting();
  const uploadFile = useUploadFile();

  const byKey = new Map((settings ?? []).map((s) => [s.key, s.value]));
  const siteName = byKey.get('site_name') as string | undefined;
  const siteLogo = byKey.get('site_logo') as SiteLogoValue | undefined;
  const timezone = byKey.get('timezone') as string | undefined;
  const registrationEnabled = byKey.get('registration_enabled') as boolean | undefined;

  // `null` = người dùng chưa gõ gì — hiển thị thẳng giá trị server, không cần useEffect đồng bộ (dễ
  // gây render lồng nhau). Gõ vào thì chuyển sang "draft" cục bộ; lưu xong thì quay lại `null` để lần
  // tải dữ liệu mới nhất từ server hiển thị lại (invalidateQueries đã tự làm mới `settings`).
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [timezoneDraft, setTimezoneDraft] = useState<string | null>(null);
  const nameValue = nameDraft ?? siteName ?? '';
  const timezoneValue = timezoneDraft ?? timezone ?? '';

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploaded = await uploadFile.mutateAsync({ file }).catch(() => null);
    if (uploaded) update.mutate({ key: 'site_logo', value: uploaded.id });
    e.target.value = '';
  }

  return (
    <div>
      <PageHeader
        title="Cấu hình hệ thống"
        description="Thông tin website và các cờ tổng quát — riêng biệt với Phương thức đăng nhập."
      />

      {isLoading ? (
        <p className="text-sm text-ink-muted">Đang tải...</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl border border-border-soft bg-white p-6">
            <p className="mb-1 text-sm font-semibold text-ink">Logo website</p>
            <p className="mb-4 text-xs text-ink-muted">Hiển thị ở header storefront (khi được nối).</p>
            <div className="flex items-center gap-4">
              {siteLogo?.url ? (
                <Image
                  src={siteLogo.url}
                  alt=""
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-2xl border border-border-soft object-contain p-2"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-light">
                  <FlowerIcon className="h-7 w-7" color="var(--color-rose)" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <label className="cursor-pointer text-sm font-medium text-rose hover:text-rose-dark">
                  {uploadFile.isPending ? 'Đang tải lên...' : siteLogo ? 'Đổi logo' : 'Chọn logo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </label>
                {siteLogo && (
                  <button
                    type="button"
                    onClick={() => update.mutate({ key: 'site_logo', value: null })}
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Gỡ logo
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border-soft bg-white p-6">
            <label className="mb-1.5 block text-sm font-semibold text-ink">Tên website</label>
            <p className="mb-3 text-xs text-ink-muted">Hiển thị ở tiêu đề trang, email gửi đi.</p>
            <div className="flex flex-wrap gap-2">
              <input
                value={nameValue}
                onChange={(e) => setNameDraft(e.target.value)}
                className="w-full max-w-sm rounded-xl border border-border px-3.5 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
              />
              <Button
                size="sm"
                loading={update.isPending}
                disabled={!nameValue.trim() || nameValue === siteName}
                onClick={() =>
                  update.mutate(
                    { key: 'site_name', value: nameValue.trim() },
                    { onSuccess: () => setNameDraft(null) },
                  )
                }
              >
                Lưu
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-border-soft bg-white p-6">
            <label className="mb-1.5 block text-sm font-semibold text-ink">Múi giờ</label>
            <p className="mb-3 text-xs text-ink-muted">
              Định dạng IANA, ví dụ <code>Asia/Ho_Chi_Minh</code>.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                value={timezoneValue}
                onChange={(e) => setTimezoneDraft(e.target.value)}
                className="w-full max-w-sm rounded-xl border border-border px-3.5 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
              />
              <Button
                size="sm"
                loading={update.isPending}
                disabled={!timezoneValue.trim() || timezoneValue === timezone}
                onClick={() =>
                  update.mutate(
                    { key: 'timezone', value: timezoneValue.trim() },
                    { onSuccess: () => setTimezoneDraft(null) },
                  )
                }
              >
                Lưu
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-3xl border border-border-soft bg-white p-6">
            <div>
              <p className="text-sm font-semibold text-ink">Cho phép đăng ký tài khoản mới</p>
              <p className="mt-1 text-xs text-ink-muted">
                Tắt để tạm khoá tạo tài khoản mới (email/mật khẩu, magic link, Google) — KHÔNG ảnh
                hưởng người dùng đã có tài khoản đăng nhập lại.
              </p>
            </div>
            <Switch
              checked={registrationEnabled ?? true}
              disabled={update.isPending}
              onChange={() =>
                update.mutate({ key: 'registration_enabled', value: !(registrationEnabled ?? true) })
              }
              label="Cho phép đăng ký tài khoản mới"
            />
          </div>
        </div>
      )}
    </div>
  );
}
