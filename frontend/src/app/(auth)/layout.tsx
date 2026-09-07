import Link from 'next/link';
import { FlowerIcon } from '@/components/ui/FlowerIcon';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <FlowerIcon className="h-7 w-7" color="var(--color-rose)" />
          <span className="font-display text-2xl font-semibold text-ink">Hoa Xinh</span>
        </Link>
        <div className="rounded-3xl border border-border-soft bg-white p-8 shadow-sm">{children}</div>
      </div>
    </div>
  );
}
