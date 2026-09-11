const STEPS = [
  { key: 'cart', label: 'Giỏ hàng' },
  { key: 'checkout', label: 'Thông tin giao' },
  { key: 'confirm', label: 'Xác nhận' },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

// Chỉ báo tiến trình đặt hàng — dùng chung ở /gio-hang, /thanh-toan, /don-hang/[id]. Giúp khách biết
// đang ở bước nào trong luồng mua hàng, giảm cảm giác "không biết còn bao lâu nữa" — mẫu UX phổ biến
// ở checkout hiện đại, trước đây 3 trang này không có gì liên kết trực quan với nhau.
export function CheckoutSteps({ current }: { current: StepKey }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={step.key} className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-semibold ${
                  done
                    ? 'bg-rose text-white'
                    : active
                      ? 'border-2 border-rose text-rose-dark'
                      : 'border border-border text-ink-muted'
                }`}
              >
                {done ? (
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <polyline points="4 12 9 17 20 6" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={`text-xs font-medium whitespace-nowrap ${active || done ? 'text-ink' : 'text-ink-muted'}`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-border sm:w-10" />}
          </div>
        );
      })}
    </div>
  );
}
