import { InputHTMLAttributes } from 'react';
import { FieldError } from 'react-hook-form';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: FieldError;
};

// Field validate theo từng ô, gắn với schema zod ở tầng gọi (react-hook-form + @hookform/resolvers/zod)
// — xem ARCHITECTURE.md §7.2.
export function FormField({ label, error, id, className = '', ...rest }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-neutral-700">
        {label}
      </label>
      <input
        id={id}
        className={`rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900 ${
          error ? 'border-red-500' : 'border-neutral-300'
        } ${className}`}
        {...rest}
      />
      {error && <p className="text-xs text-red-600">{error.message}</p>}
    </div>
  );
}
