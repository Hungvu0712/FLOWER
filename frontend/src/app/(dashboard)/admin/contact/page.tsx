'use client';

import { useState } from 'react';
import { useContactMessages, useSetContactHandled } from '@/features/core/contact/contact.hooks';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { IconMail } from '@/components/admin/icons';

const FILTERS = [
  { label: 'Tất cả', value: undefined },
  { label: 'Chưa xử lý', value: false },
  { label: 'Đã xử lý', value: true },
] as const;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN');
}

// contact.manage là permission core (xem docs/modules/core-contact.md) nhưng mount dưới /admin/* —
// quy ước /admin/* vs /superadmin/* phân theo mức truy cập (admin dùng được), không phải theo code
// nằm ở core hay domain. Xem routes/v1/index.ts.
export default function ContactMessagesPage() {
  const [filter, setFilter] = useState<boolean | undefined>(false);
  const { data, isLoading } = useContactMessages({ isHandled: filter, limit: 50 });
  const setHandled = useSetContactHandled();

  const messages = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Liên hệ"
        description="Tin nhắn khách gửi qua form Liên hệ trên storefront."
      />

      <div className="mb-6 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              filter === f.value
                ? 'border-rose bg-rose-light text-rose-dark'
                : 'border-border text-ink-soft hover:border-rose hover:text-rose'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-ink-muted">Đang tải...</p>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
          <IconMail className="h-8 w-8 text-ink-muted" />
          <p className="text-sm text-ink-muted">Chưa có tin nhắn nào.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((m) => (
            <div key={m.id} className="rounded-3xl border border-border-soft bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{m.name}</p>
                    <StatusBadge tone={m.isHandled ? 'success' : 'warning'}>
                      {m.isHandled ? 'Đã xử lý' : 'Chưa xử lý'}
                    </StatusBadge>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {m.phone}
                    {m.email && <> · {m.email}</>} · {formatDateTime(m.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`tel:${m.phone}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink-soft hover:border-rose hover:text-rose"
                    aria-label={`Gọi ${m.name}`}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M4 5.5c0-1.1.9-2 2-2h2.2c.5 0 .95.35 1.06.85l.9 4c.1.45-.06.9-.4 1.2l-1.7 1.4a13 13 0 0 0 5.9 5.9l1.4-1.7c.3-.34.75-.5 1.2-.4l4 .9c.5.1.85.56.85 1.06V19c0 1.1-.9 2-2 2h-1C10.8 21 3 13.2 3 3.6v-1Z" />
                    </svg>
                  </a>
                  <Button
                    variant="outline"
                    size="sm"
                    loading={setHandled.isPending}
                    onClick={() => setHandled.mutate({ id: m.id, isHandled: !m.isHandled })}
                  >
                    {m.isHandled ? 'Đánh dấu chưa xử lý' : 'Đánh dấu đã xử lý'}
                  </Button>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm text-ink-soft">{m.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
