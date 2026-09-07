'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLogout } from '@/features/core/auth/auth.hooks';
import { Avatar } from '@/components/admin/Avatar';
import { IconUserCircle, IconLogout, IconDashboard } from '@/components/admin/icons';
import type { Me } from '@/features/core/account/account.service';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  member: 'Thành viên',
};

// Dropdown tên người dùng trên Nav — hiện thông tin tài khoản, role (nếu có) và nút đăng xuất ngay tại
// đây thay vì chỉ link thẳng vào hồ sơ như trước.
export function UserMenu({ me }: { me: Me }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const logout = useLogout();

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const roleLabel = me.roles[0] ? (ROLE_LABELS[me.roles[0]] ?? me.roles[0]) : null;
  const isAdmin = me.roles.includes('admin') || me.roles.includes('super_admin');

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium text-ink-soft hover:text-rose"
      >
        <Avatar name={me.fullName} size="sm" />
        {me.fullName}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-border-soft bg-white p-2 shadow-lg">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-ink">{me.fullName}</p>
            <p className="truncate text-xs text-ink-muted">{me.email}</p>
            {roleLabel && (
              <span className="mt-1.5 inline-block rounded-full bg-rose-light px-2 py-0.5 text-[11px] font-medium text-rose-dark">
                {roleLabel}
              </span>
            )}
          </div>
          <div className="my-1 border-t border-border-soft" />
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-soft hover:bg-ivory-50"
            >
              <IconDashboard className="h-4 w-4" />
              Quản trị
            </Link>
          )}
          <Link
            href="/account/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-soft hover:bg-ivory-50"
          >
            <IconUserCircle className="h-4 w-4" />
            Thông tin tài khoản
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              logout.mutate();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-ink-soft hover:bg-ivory-50"
          >
            <IconLogout className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
