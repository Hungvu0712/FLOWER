type Props = {
  name: string;
  size?: 'sm' | 'md';
  className?: string;
};

const sizeClasses: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

export function Avatar({ name, size = 'md', className = '' }: Props) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-rose-light font-semibold text-rose-dark ${sizeClasses[size]} ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
