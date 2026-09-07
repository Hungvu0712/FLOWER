import { InputHTMLAttributes } from 'react';
import { FieldError } from 'react-hook-form';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: FieldError;
};

// Field validate theo từng ô, gắn với schema zod ở tầng gọi (react-hook-form + @hookform/resolvers/zod)
// — xem ARCHITECTURE.md §13.3. `register('fieldName')` không tự sinh `id`, nên mặc định lấy theo
// `name` để <label htmlFor> luôn liên kết đúng với input (accessibility).
export function FormField({ label, error, id, name, className = '', ...rest }: Props) {
  const inputId = id ?? name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-ink-soft">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        className={`rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-rose focus:ring-1 focus:ring-rose ${
          error ? 'border-red-400' : 'border-border'
        } ${className}`}
        {...rest}
      />
      {error && <p className="text-xs text-red-600">{error.message}</p>}
    </div>
  );
}
