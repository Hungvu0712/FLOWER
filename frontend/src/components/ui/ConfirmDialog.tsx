'use client';

import { useConfirmStore } from '@/store/useConfirmStore';
import { Button } from './Button';

// Mount 1 lần ở root layout (app/layout.tsx) — hiện dialog xác nhận từ mọi nơi qua confirmDialog().
export function ConfirmDialog() {
  const { open, title, message, danger, handle } = useConfirmStore();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/30 px-4">
      <div className="w-full max-w-sm rounded-3xl border border-border-soft bg-white p-6 shadow-xl">
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-sm text-ink-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => handle(false)}>
            Huỷ
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={() => handle(true)}>
            Xác nhận
          </Button>
        </div>
      </div>
    </div>
  );
}
