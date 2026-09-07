'use client';

import { useToastStore } from '@/store/useToastStore';

// Mount 1 lần ở root layout (app/layout.tsx) — hiện toast từ mọi nơi trong app qua useToastStore.push().
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          onClick={() => dismiss(toast.id)}
          className={`pointer-events-auto rounded-full border px-5 py-2.5 text-sm font-medium shadow-lg transition-opacity ${
            toast.type === 'success'
              ? 'border-sage/30 bg-white text-sage'
              : 'border-red-200 bg-white text-red-600'
          }`}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}
