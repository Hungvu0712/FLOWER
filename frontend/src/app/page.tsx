'use client';

import Link from 'next/link';
import { useMe } from '@/features/core/account/account.hooks';

// Trang chủ storefront thật (sản phẩm, danh mục...) thuộc domain — viết ở features/domain khi triển
// khai nghiệp vụ. Trang này chỉ là smoke-test hub cho phần core (auth/RBAC) của source base.
export default function Home() {
  const { data: me } = useMe();

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold text-neutral-900">🌸 Flower Shop</h1>
      <p className="text-sm text-neutral-500">
        Trang chủ storefront (domain) sẽ được xây dựng ở đây. Hiện tại là core source base.
      </p>

      {me ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-neutral-700">Xin chào, {me.fullName} ({me.roles.join(', ')})</p>
          <div className="flex gap-3 text-sm">
            <Link href="/account/profile" className="text-neutral-900 underline">Tài khoản</Link>
            {me.roles.some((r) => ['admin', 'super_admin'].includes(r)) && (
              <Link href="/admin" className="text-neutral-900 underline">Admin</Link>
            )}
            {me.roles.includes('super_admin') && (
              <Link href="/superadmin/users" className="text-neutral-900 underline">SuperAdmin</Link>
            )}
          </div>
        </div>
      ) : (
        <Link href="/login" className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">
          Đăng nhập
        </Link>
      )}
    </div>
  );
}
