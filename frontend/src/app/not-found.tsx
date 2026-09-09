import Link from 'next/link';
import { FlowerIcon } from '@/components/ui/FlowerIcon';
import { Button } from '@/components/ui/Button';

// Next.js tự dùng file này cho MỌI route không khớp (không cần khai báo lại ở từng route group) —
// nằm ngoài (storefront)/layout.tsx nên không có sẵn Nav/Footer, tự dựng khung tối giản riêng.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ivory px-4 text-center">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <FlowerIcon className="h-7 w-7" color="var(--color-rose)" />
        <span className="font-display text-2xl font-semibold text-ink">Hoa Xinh</span>
      </Link>

      <p className="font-display text-7xl font-semibold text-rose">404</p>
      <h1 className="mt-4 font-display text-2xl font-semibold text-ink">Không tìm thấy trang</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        Trang bạn tìm có thể đã bị gỡ, đổi tên, hoặc đường dẫn không đúng.
      </p>

      <Link href="/" className="mt-8">
        <Button>Về trang chủ</Button>
      </Link>
    </div>
  );
}
