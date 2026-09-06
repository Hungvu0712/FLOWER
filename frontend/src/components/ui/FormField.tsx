import { InputHTMLAttributes } from 'react';
import { FieldError } from 'react-hook-form';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: FieldError;
};

// Field validate theo từng ô, gắn với schema zod ở tầng gọi (react-hook-form + @hookform/resolvers/zod)
// — xem ARCHITECTURE.md §7.2. `register('fieldName')` không tự sinh `id`, nên mặc định lấy theo `name`
// để <label htmlFor> luôn liên kết đúng với input (accessibility) mà không phải truyền `id` thủ công.
export function FormField({ label, error, id, name, className = '', ...rest }: Props) {
  const inputId = id ?? name;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-neutral-700">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        className={`rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900 ${
          error ? 'border-red-500' : 'border-neutral-300'
        } ${className}`}
        {...rest}
      />
      {error && <p className="text-xs text-red-600">{error.message}</p>}
    </div>
  );
}
