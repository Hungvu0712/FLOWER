import Link from 'next/link';
import { FlowerIcon } from '@/components/ui/FlowerIcon';
import { Button } from '@/components/ui/Button';

// Đích redirect khi user ĐÃ đăng nhập nhưng không đủ quyền vào /admin, /superadmin (xem
// components/admin/AdminShell.tsx) — cố tình khác /login (không phải chưa đăng nhập) và khác trang
// chủ (không âm thầm redirect, người dùng cần biết vì sao bị chặn). Đây chỉ là lớp UX — quyền thật sự
// luôn được backend authorize() kiểm tra độc lập ở từng API. Xem docs/02 §8, docs/04 §3.
export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ivory px-4 text-center">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <FlowerIcon className="h-7 w-7" color="var(--color-rose)" />
        <span className="font-display text-2xl font-semibold text-ink">Hoa Xinh</span>
      </Link>

      <p className="font-display text-7xl font-semibold text-rose">403</p>
      <h1 className="mt-4 font-display text-2xl font-semibold text-ink">Không có quyền truy cập</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">Bạn không có quyền truy cập trang này.</p>

      <Link href="/" className="mt-8">
        <Button>Về trang chủ</Button>
      </Link>
    </div>
  );
}
