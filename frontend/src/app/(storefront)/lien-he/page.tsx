'use client';

import { useState } from 'react';
import { AxiosError } from 'axios';
import { useSubmitContact } from '@/features/core/contact/contact.hooks';
import { Button } from '@/components/ui/Button';
import {
  HOTLINE,
  HOTLINE_DISPLAY,
  ADDRESS,
  OPEN_HOURS,
  ZALO_LINK,
  ZALO_DISPLAY,
} from '@/lib/contact-info';

type FormState = {
  name: string;
  phone: string;
  occasion: string;
  message: string;
};
const emptyForm: FormState = { name: '', phone: '', occasion: '', message: '' };

const PhoneIcon = (
  <svg
    className="h-full w-full"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
  >
    <path d="M4 5.5c0-1.1.9-2 2-2h2.2c.5 0 .95.35 1.06.85l.9 4c.1.45-.06.9-.4 1.2l-1.7 1.4a13 13 0 0 0 5.9 5.9l1.4-1.7c.3-.34.75-.5 1.2-.4l4 .9c.5.1.85.56.85 1.06V19c0 1.1-.9 2-2 2h-1C10.8 21 3 13.2 3 3.6v-1Z" />
  </svg>
);
const ZaloIcon = (
  <svg
    className="h-full w-full"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
  >
    <path d="M21 15.5a2 2 0 0 1-2 2H8l-5 4V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9.5Z" />
  </svg>
);
function InfoRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="border-b border-border-soft py-5 first:pt-0 last:border-none last:pb-0">
      <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{label}</p>
      {href ? (
        <a
          href={href}
          target={href.startsWith('http') ? '_blank' : undefined}
          rel="noopener noreferrer"
          className="mt-1 block text-lg font-semibold text-rose hover:text-rose-dark"
        >
          {value}
        </a>
      ) : (
        <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
      )}
    </div>
  );
}

function PillLink({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl bg-white px-5 py-3.5 text-ink transition-transform hover:-translate-y-0.5"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-light p-2 text-rose-dark">
        {icon}
      </span>
      <span>
        <span className="block text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
          {label}
        </span>
        <span className="block text-sm font-bold">{value}</span>
      </span>
    </a>
  );
}

export default function ContactPage() {
  const submitContact = useSubmitContact();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    const message = form.occasion.trim()
      ? `Dịp cần hoa: ${form.occasion.trim()}\n\n${form.message}`
      : form.message;
    submitContact.mutate(
      { name: form.name, phone: form.phone, message },
      {
        onSuccess: () => {
          setSent(true);
          setForm(emptyForm);
        },
        onError: (error) => {
          if (error instanceof AxiosError && error.response?.status === 422) {
            setFieldErrors(error.response.data.errors ?? {});
          }
        },
      },
    );
  }

  return (
    <div>
      {/* Hero — băng riêng tông rose-light, khác nền trắng của phần dưới */}
      <section className="bg-rose-light px-8 py-16 text-center lg:px-16">
        <p className="mb-3 text-sm font-semibold tracking-widest text-rose uppercase">Liên hệ</p>
        <h1 className="font-display text-4xl font-semibold text-ink lg:text-5xl">
          Đặt hoa nhanh, chỉ một cuộc gọi
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-ink-muted">
          Gọi điện hoặc nhắn Zalo để được tư vấn nhanh nhất, mở cửa {OPEN_HOURS}. Ngoài giờ vẫn có
          thể để lại lời nhắn, chúng tôi phản hồi ngay khi mở cửa lại.
        </p>
      </section>

      {/* Thông tin cửa hàng + form */}
      <section className="px-8 py-16 lg:px-16">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="mb-2 font-display text-2xl font-semibold text-ink">
              Thông tin cửa hàng
            </h2>
            <div className="mt-4">
              <InfoRow label="Hotline đặt hoa" value={HOTLINE_DISPLAY} href={`tel:${HOTLINE}`} />
              <InfoRow label="Zalo" value={ZALO_DISPLAY} href={ZALO_LINK} />
              <InfoRow label="Địa chỉ" value={ADDRESS} />
              <InfoRow label="Giờ mở cửa" value={OPEN_HOURS} />
            </div>
          </div>

          <div className="rounded-3xl border border-border-soft bg-white p-8">
            {sent ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-light">
                  <svg
                    className="h-7 w-7 text-rose"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <polyline points="4 12 9 17 20 6" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-ink">Đã gửi thành công</h2>
                <p className="max-w-xs text-sm text-ink-muted">
                  Cảm ơn bạn đã liên hệ — chúng tôi sẽ phản hồi sớm nhất có thể.
                </p>
                <Button variant="outline" size="sm" onClick={() => setSent(false)}>
                  Gửi lời nhắn khác
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-ink">Gửi yêu cầu tư vấn</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-ink-muted">
                      Họ và tên
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
                    />
                    {fieldErrors.name && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-ink-muted">
                      Số điện thoại
                    </label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
                    />
                    {fieldErrors.phone && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink-muted">
                    Dịp cần hoa (tuỳ chọn)
                  </label>
                  <input
                    placeholder="Sinh nhật, khai trương, cưới hỏi..."
                    value={form.occasion}
                    onChange={(e) => setForm((f) => ({ ...f, occasion: e.target.value }))}
                    className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none placeholder:text-ink-muted/60 focus:border-rose focus:ring-1 focus:ring-rose"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink-muted">
                    Lời nhắn
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Mẫu hoa bạn muốn, ngân sách, thời gian giao..."
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none placeholder:text-ink-muted/60 focus:border-rose focus:ring-1 focus:ring-rose"
                  />
                  {fieldErrors.message && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.message}</p>
                  )}
                </div>

                {submitContact.isError && !Object.keys(fieldErrors).length && (
                  <p className="text-xs text-red-600">Gửi không thành công, thử lại sau ít phút.</p>
                )}

                <Button
                  type="submit"
                  loading={submitContact.isPending}
                  disabled={!form.name || !form.phone || !form.message}
                >
                  Gửi yêu cầu
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* CTA đậm — dùng tông ink có sẵn của hệ thống, không phải màu xanh của trang tham khảo */}
      <section className="bg-ink px-8 py-12 lg:px-16">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-white lg:text-3xl">
              Chưa biết chọn mẫu nào?
            </h2>
            <p className="mt-2 max-w-md text-sm text-white/70">
              Gọi hoặc nhắn Zalo cho chúng tôi — tư vấn mẫu phù hợp và báo giá ngay trong vài phút,
              hỗ trợ cả đơn gấp cần giao trong ngày.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <PillLink
              icon={PhoneIcon}
              label="Gọi đặt hoa ngay"
              value={HOTLINE_DISPLAY}
              href={`tel:${HOTLINE}`}
            />
            <PillLink icon={ZaloIcon} label="Nhắn tin Zalo" value={ZALO_DISPLAY} href={ZALO_LINK} />
          </div>
        </div>
      </section>
    </div>
  );
}
