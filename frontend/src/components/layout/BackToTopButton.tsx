'use client';

// 'use client' riêng chỉ cho nút này — phần còn lại của Footer vẫn là Server Component, không cần
// kéo cả cây xuống client chỉ vì 1 nút cuộn trang.
export function BackToTopButton() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Lên đầu trang"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-white text-ink-soft shadow-sm transition-colors hover:border-rose hover:text-rose"
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      >
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="6 11 12 5 18 11" />
      </svg>
    </button>
  );
}
