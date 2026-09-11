type Tone = 'success' | 'danger' | 'warning' | 'neutral';

const toneClasses: Record<Tone, string> = {
  success: 'bg-sage/15 text-sage',
  danger: 'bg-red-600/10 text-red-600',
  warning: 'bg-amber-500/15 text-amber-600',
  neutral: 'bg-border-soft text-ink-muted',
};

export function StatusBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
