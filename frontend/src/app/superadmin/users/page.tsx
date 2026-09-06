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
    <div>
      <h1 className="mb-4 text-lg font-semibold text-neutral-900">Quản lý người dùng</h1>

      <input
        placeholder="Tìm theo tên/email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
      />

      {isLoading ? (
        <p className="text-sm text-neutral-500">Đang tải...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-2">Họ tên</th>
                <th className="py-2">Email</th>
                <th className="py-2">Role</th>
                <th className="py-2">Trạng thái</th>
                <th className="py-2">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((user) => {
                const isSelf = user.id === me?.id;
                return (
                  <tr key={user.id} className="border-b border-neutral-100">
                    <td className="py-2">{user.fullName}</td>
                    <td className="py-2">{user.email}</td>
                    <td className="py-2">{user.roles.map((r) => r.role.name).join(', ')}</td>
                    <td className="py-2">
                      <span className={user.status === 'blocked' ? 'text-red-600' : 'text-green-600'}>
                        {user.status === 'blocked' ? 'Đã khoá' : 'Hoạt động'}
                      </span>
                    </td>
                    <td className="flex flex-wrap gap-2 py-2">
                      {user.status === 'active' ? (
                        <Button
                          variant="ghost"
                          disabled={isSelf}
                          onClick={() => blockUser.mutate(user.id)}
                        >
                          Khoá
                        </Button>
                      ) : (
                        <Button variant="ghost" onClick={() => unblockUser.mutate(user.id)}>
                          Mở khoá
                        </Button>
                      )}
                      <Button variant="ghost" onClick={() => resetPassword.mutate(user.id)}>
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
