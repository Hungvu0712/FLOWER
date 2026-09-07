import Link from 'next/link';
import { FlowerIcon } from '@/components/ui/FlowerIcon';

export function Footer() {
  return (
    <footer className="border-t border-border-soft px-8 py-12 lg:px-16">
      <div className="flex flex-col gap-8 md:flex-row md:justify-between">
        <div className="flex items-center gap-2.5">
          <FlowerIcon className="h-5 w-5" color="var(--color-rose)" />
          <span className="font-display text-lg font-semibold text-ink">Hoa Xinh</span>
        </div>
        <div className="flex flex-wrap gap-8 text-sm text-ink-muted">
          <Link href="/" className="hover:text-rose">Chính sách đổi trả</Link>
          <Link href="/" className="hover:text-rose">Chính sách giao hàng</Link>
          <Link href="/" className="hover:text-rose">Chính sách bảo mật</Link>
          <Link href="/" className="hover:text-rose">Liên hệ</Link>
        </div>
      </div>
      <p className="mt-8 text-xs text-ink-muted">© {new Date().getFullYear()} Hoa Xinh. Hoa tươi mỗi ngày.</p>
    </footer>
  );
}
