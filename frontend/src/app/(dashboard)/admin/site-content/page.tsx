'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  useSiteContentAdmin,
  useUpdateSiteContent,
} from '@/features/domain/siteContent/siteContent.hooks';
import { useUploadFile } from '@/features/core/files/files.hooks';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/Button';
import { FlowerIcon } from '@/components/ui/FlowerIcon';

type HeroBannerValue = { fileId: string; url: string } | null;

// Nội dung storefront admin/super_admin tự sửa (permission site_content.manage — khác settings.manage
// của /superadmin/settings, chỉ super_admin) — banner Hero + hotline/Zalo/địa chỉ/giờ mở cửa, xem
// docs/modules/domain-site-content.md. UI copy khuôn từ superadmin/settings/page.tsx.
export default function SiteContentPage() {
  const { data: items, isLoading } = useSiteContentAdmin();
  const update = useUpdateSiteContent();
  const uploadFile = useUploadFile();

  const byKey = new Map((items ?? []).map((s) => [s.key, s.value]));
  const heroBanner = byKey.get('hero_banner') as HeroBannerValue | undefined;
  const hotline = byKey.get('hotline') as string | undefined;
  const zaloLink = byKey.get('zalo_link') as string | undefined;
  const address = byKey.get('address') as string | undefined;
  const openHours = byKey.get('open_hours') as string | undefined;

  // `null` = chưa gõ gì — hiển thị thẳng giá trị server, giống pattern superadmin/settings/page.tsx.
  const [hotlineDraft, setHotlineDraft] = useState<string | null>(null);
  const [zaloDraft, setZaloDraft] = useState<string | null>(null);
  const [addressDraft, setAddressDraft] = useState<string | null>(null);
  const [openHoursDraft, setOpenHoursDraft] = useState<string | null>(null);
  const hotlineValue = hotlineDraft ?? hotline ?? '';
  const zaloValue = zaloDraft ?? zaloLink ?? '';
  const addressValue = addressDraft ?? address ?? '';
  const openHoursValue = openHoursDraft ?? openHours ?? '';

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploaded = await uploadFile.mutateAsync({ file }).catch(() => null);
    if (uploaded) update.mutate({ key: 'hero_banner', value: uploaded.id });
    e.target.value = '';
  }

  return (
    <div>
      <PageHeader
        title="Nội dung trang"
        description="Banner trang chủ, hotline, Zalo, địa chỉ và giờ mở cửa hiển thị trên storefront."
      />

      {isLoading ? (
        <p className="text-sm text-ink-muted">Đang tải...</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl border border-border-soft bg-white p-6">
            <p className="mb-1 text-sm font-semibold text-ink">Banner trang chủ (Hero)</p>
            <p className="mb-4 text-xs text-ink-muted">
              Ảnh bó hoa hiển thị ở banner đầu trang chủ. Chưa chọn ảnh → dùng ảnh mặc định có sẵn.
            </p>
            <div className="flex items-center gap-4">
              {heroBanner?.url ? (
                <Image
                  src={heroBanner.url}
                  alt=""
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-2xl border border-border-soft object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-rose-light">
                  <FlowerIcon className="h-9 w-9" color="var(--color-rose)" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <label className="cursor-pointer text-sm font-medium text-rose hover:text-rose-dark">
                  {uploadFile.isPending
                    ? 'Đang tải lên...'
                    : heroBanner
                      ? 'Đổi banner'
                      : 'Chọn ảnh'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleBannerChange}
                  />
                </label>
                {heroBanner && (
                  <button
                    type="button"
                    onClick={() => update.mutate({ key: 'hero_banner', value: null })}
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Dùng ảnh mặc định
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border-soft bg-white p-6">
            <label className="mb-1.5 block text-sm font-semibold text-ink">Hotline</label>
            <p className="mb-3 text-xs text-ink-muted">
              Hiển thị nguyên văn (kể cả khoảng trắng) — dùng cho nút &quot;Gọi ngay&quot; ở khắp
              storefront.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                value={hotlineValue}
                onChange={(e) => setHotlineDraft(e.target.value)}
                className="w-full max-w-sm rounded-xl border border-border px-3.5 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
              />
              <Button
                size="sm"
                loading={update.isPending}
                disabled={!hotlineValue.trim() || hotlineValue === hotline}
                onClick={() =>
                  update.mutate(
                    { key: 'hotline', value: hotlineValue.trim() },
                    { onSuccess: () => setHotlineDraft(null) },
                  )
                }
              >
                Lưu
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-border-soft bg-white p-6">
            <label className="mb-1.5 block text-sm font-semibold text-ink">Link Zalo</label>
            <p className="mb-3 text-xs text-ink-muted">
              URL đầy đủ, ví dụ <code>https://zalo.me/0900000000</code>.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                value={zaloValue}
                onChange={(e) => setZaloDraft(e.target.value)}
                className="w-full max-w-sm rounded-xl border border-border px-3.5 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
              />
              <Button
                size="sm"
                loading={update.isPending}
                disabled={!zaloValue.trim() || zaloValue === zaloLink}
                onClick={() =>
                  update.mutate(
                    { key: 'zalo_link', value: zaloValue.trim() },
                    { onSuccess: () => setZaloDraft(null) },
                  )
                }
              >
                Lưu
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-border-soft bg-white p-6">
            <label className="mb-1.5 block text-sm font-semibold text-ink">Địa chỉ</label>
            <div className="flex flex-wrap gap-2">
              <input
                value={addressValue}
                onChange={(e) => setAddressDraft(e.target.value)}
                className="w-full max-w-sm rounded-xl border border-border px-3.5 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
              />
              <Button
                size="sm"
                loading={update.isPending}
                disabled={!addressValue.trim() || addressValue === address}
                onClick={() =>
                  update.mutate(
                    { key: 'address', value: addressValue.trim() },
                    { onSuccess: () => setAddressDraft(null) },
                  )
                }
              >
                Lưu
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-border-soft bg-white p-6">
            <label className="mb-1.5 block text-sm font-semibold text-ink">Giờ mở cửa</label>
            <p className="mb-3 text-xs text-ink-muted">
              Ví dụ <code>07:00 – 21:00 tất cả các ngày</code>.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                value={openHoursValue}
                onChange={(e) => setOpenHoursDraft(e.target.value)}
                className="w-full max-w-sm rounded-xl border border-border px-3.5 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
              />
              <Button
                size="sm"
                loading={update.isPending}
                disabled={!openHoursValue.trim() || openHoursValue === openHours}
                onClick={() =>
                  update.mutate(
                    { key: 'open_hours', value: openHoursValue.trim() },
                    { onSuccess: () => setOpenHoursDraft(null) },
                  )
                }
              >
                Lưu
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
