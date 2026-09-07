'use client';

import { useState } from 'react';
import { useMe } from '@/features/core/account/account.hooks';
import {
  useAdminUsers,
  useBlockUser,
  useUnblockUser,
  useDeleteUser,
  useResetUserPassword,
  useUpdateUserRole,
} from '@/features/core/admin-users/adminUsers.hooks';
import { useAdminRoles } from '@/features/core/admin-roles/roles.hooks';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/admin/PageHeader';
import { Avatar } from '@/components/admin/Avatar';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { confirmDialog } from '@/store/useConfirmStore';

// Ràng buộc "không tự block/xoá/đổi role chính mình" đã bị chặn cứng ở backend (SECURITY.md §2) —
// ở đây chỉ disable nút cho gọn UI, không phải lớp bảo mật.
export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const { data: me } = useMe();
  const { data, isLoading } = useAdminUsers({ search: search || undefined });
  const { data: roles } = useAdminRoles();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const deleteUser = useDeleteUser();
  const resetPassword = useResetUserPassword();
  const updateRole = useUpdateUserRole();
  const assignableRoles = (roles ?? []).filter((r) => r.code !== 'super_admin');

  return (
    <div>
      <PageHeader title="Người dùng" description="Quản lý tài khoản, khoá/mở khoá và đặt lại mật khẩu." />

      <div className="rounded-3xl border border-border-soft bg-white p-6">
        <input
          placeholder="Tìm theo tên/email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-6 w-full max-w-sm rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
        />

        {isLoading ? (
          <p className="text-sm text-ink-muted">Đang tải...</p>
        ) : !data?.items.length ? (
          <p className="text-sm text-ink-muted">Không tìm thấy người dùng nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-soft text-left text-ink-muted">
                  <th className="py-2 font-medium">Người dùng</th>
                  <th className="py-2 font-medium">Role</th>
                  <th className="py-2 font-medium">Trạng thái</th>
                  <th className="py-2 font-medium">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((user) => {
                  const isSelf = user.id === me?.id;
                  const currentRoleCode = user.roles[0]?.role.code ?? '';
                  const roleDisabled = isSelf || currentRoleCode === 'super_admin' || updateRole.isPending;
                  return (
                    <tr key={user.id} className="border-b border-border-soft/70">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={user.fullName} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink">{user.fullName}</p>
                            <p className="truncate text-xs text-ink-muted">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <select
                          value={currentRoleCode}
                          disabled={roleDisabled}
                          title={
                            isSelf
                              ? 'Không thể tự đổi role của chính mình'
                              : currentRoleCode === 'super_admin'
                                ? 'Không thể đổi role của super_admin qua đây'
                                : undefined
                          }
                          onChange={(e) => updateRole.mutate({ id: user.id, roleCode: e.target.value })}
                          className="rounded-xl border border-border bg-white px-2.5 py-1.5 text-xs text-ink-soft outline-none focus:border-rose focus:ring-1 focus:ring-rose disabled:bg-ivory-50 disabled:text-ink-muted"
                        >
                          {currentRoleCode === 'super_admin' && <option value="super_admin">Super Admin</option>}
                          {assignableRoles.map((role) => (
                            <option key={role.code} value={role.code}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3">
                        <StatusBadge tone={user.status === 'blocked' ? 'danger' : 'success'}>
                          {user.status === 'blocked' ? 'Đã khoá' : 'Hoạt động'}
                        </StatusBadge>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {user.status === 'active' ? (
                            <Button variant="outline" size="sm" disabled={isSelf} onClick={() => blockUser.mutate(user.id)}>
                              Khoá
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => unblockUser.mutate(user.id)}>
                              Mở khoá
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => resetPassword.mutate(user.id)}>
                            Reset mật khẩu
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={isSelf}
                            onClick={async () => {
                              const ok = await confirmDialog(
                                `Xoá tài khoản "${user.email}"? Hành động này không thể hoàn tác.`,
                                { title: 'Xoá tài khoản', danger: true },
                              );
                              if (ok) deleteUser.mutate(user.id);
                            }}
                          >
                            Xoá
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
