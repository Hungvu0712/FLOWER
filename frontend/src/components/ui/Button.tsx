import { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'danger' | 'ghost';
  loading?: boolean;
};

const variantClasses: Record<NonNullable<Props['variant']>, string> = {
  primary: 'bg-neutral-900 text-white hover:bg-neutral-700',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'bg-transparent text-neutral-900 hover:bg-neutral-100 border border-neutral-300',
};

export function Button({ variant = 'primary', loading, disabled, className = '', children, ...rest }: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {loading ? 'Đang xử lý...' : children}
    </button>
  );
}
