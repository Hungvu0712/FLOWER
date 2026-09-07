import { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  loading?: boolean;
};

const variantClasses: Record<NonNullable<Props['variant']>, string> = {
  primary: 'bg-rose text-white hover:bg-rose-dark',
  outline: 'bg-transparent text-ink-soft border border-border hover:border-ink-soft',
  ghost: 'bg-transparent text-ink-soft hover:bg-ivory-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

export function Button({ variant = 'primary', loading, disabled, className = '', children, ...rest }: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {loading ? 'Đang xử lý...' : children}
    </button>
  );
}
