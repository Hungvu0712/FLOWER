'use client';

import { useState } from 'react';
import { useMe } from '@/features/core/account/account.hooks';
import {
  useAdminUsers,
  useBlockUser,
  useUnblockUser,
  useDeleteUser,
  useResetUserPassword,
} from '@/features/core/admin-users/adminUsers.hooks';
import { Button } from '@/components/ui/Button';

// Ràng buộc "không tự block/xoá/đổi role chính mình" đã bị chặn cứng ở backend (SECURITY.md §2) —
// ở đây chỉ disable nút cho gọn UI, không phải lớp bảo mật.
export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const { data: me } = useMe();
  const { data, isLoading } = useAdminUsers({ search: search || undefined });
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const deleteUser = useDeleteUser();
  const resetPassword = useResetUserPassword();

  return (
    <div className="rounded-3xl border border-border-soft bg-white p-8">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">Quản lý người dùng</h1>

      <input
        placeholder="Tìm theo tên/email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-6 w-full max-w-sm rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
      />

      {isLoading ? (
        <p className="text-sm text-ink-muted">Đang tải...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-soft text-left text-ink-muted">
                <th className="py-2 font-medium">Họ tên</th>
                <th className="py-2 font-medium">Email</th>
                <th className="py-2 font-medium">Role</th>
                <th className="py-2 font-medium">Trạng thái</th>
                <th className="py-2 font-medium">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((user) => {
                const isSelf = user.id === me?.id;
                return (
                  <tr key={user.id} className="border-b border-border-soft/70">
                    <td className="py-3">{user.fullName}</td>
                    <td className="py-3">{user.email}</td>
                    <td className="py-3">{user.roles.map((r) => r.role.name).join(', ')}</td>
                    <td className="py-3">
                      <span className={user.status === 'blocked' ? 'text-red-600' : 'text-sage'}>
                        {user.status === 'blocked' ? 'Đã khoá' : 'Hoạt động'}
                      </span>
                    </td>
                    <td className="flex flex-wrap gap-2 py-3">
                      {user.status === 'active' ? (
                        <Button variant="outline" disabled={isSelf} onClick={() => blockUser.mutate(user.id)}>
                          Khoá
                        </Button>
                      ) : (
                        <Button variant="outline" onClick={() => unblockUser.mutate(user.id)}>
                          Mở khoá
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => resetPassword.mutate(user.id)}>
                        Reset mật khẩu
                      </Button>
                      <Button
                        variant="danger"
                        disabled={isSelf}
                        onClick={() => {
                          if (confirm(`Xoá tài khoản ${user.email}?`)) deleteUser.mutate(user.id);
                        }}
                      >
                        Xoá
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
