'use client';

import { useState } from 'react';
import {
  useAdminRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
} from '@/features/core/admin-roles/roles.hooks';
import { useAdminPermissions } from '@/features/core/admin-permissions/permissions.hooks';
import type { RoleListItem } from '@/features/core/admin-roles/roles.service';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { PermissionPicker } from '@/components/admin/PermissionPicker';
import { confirmDialog } from '@/store/useConfirmStore';

type FormState = { code: string; name: string; description: string; permissionIds: number[] };
const emptyForm: FormState = { code: '', name: '', description: '', permissionIds: [] };

// Role tuỳ chỉnh (không phải System Role) chỉ được gán permission "assignable" (is_restricted=false) —
// backend vẫn tự lọc bỏ permission restricted dù client gửi gì (docs/07 §2), nhưng picker chỉ hiện
// permission được phép ngay từ đầu để UX rõ ràng, không tạo cảm giác chọn được mà lưu lại mất.
export default function RolesPage() {
  const { data: roles, isLoading } = useAdminRoles();
  const { data: assignablePermissions } = useAdminPermissions({ assignable: true });
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);

  function startEdit(role: RoleListItem) {
    setEditingId(role.id);
    setEditForm({
      code: role.code,
      name: role.name,
      description: role.description ?? '',
      permissionIds: role.permissions.map((rp) => rp.permission.id),
    });
  }

  function submitCreate() {
    createRole.mutate(
      {
        code: createForm.code,
        name: createForm.name,
        ...(createForm.description && { description: createForm.description }),
        permissionIds: createForm.permissionIds,
      },
      { onSuccess: () => { setCreating(false); setCreateForm(emptyForm); } },
    );
  }

  function submitEdit(id: number) {
    updateRole.mutate(
      { id, input: { name: editForm.name, description: editForm.description, permissionIds: editForm.permissionIds } },
      { onSuccess: () => setEditingId(null) },
    );
  }

  return (
    <div>
      <PageHeader
        title="Role"
        description="Quản lý role tuỳ chỉnh và permission được gán. 3 System Role (Super Admin/Admin/Member) không thể sửa cấu trúc quyền hoặc xoá."
        actions={
          <Button
            size="sm"
            variant={creating ? 'outline' : 'primary'}
            onClick={() => setCreating((v) => !v)}
          >
            {creating ? 'Đóng' : 'Tạo role mới'}
          </Button>
        }
      />

      {creating && (
        <div className="mb-6 rounded-3xl border border-border-soft bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-ink">Role mới</h2>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Code (vd: sales_staff)</label>
              <input
                value={createForm.code}
                onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value }))}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Tên hiển thị</label>
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">Mô tả (tuỳ chọn)</label>
            <input
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
            />
          </div>
          <div className="mb-5">
            <p className="mb-2 text-xs font-medium text-ink-muted">Permission</p>
            <PermissionPicker
              permissions={assignablePermissions ?? []}
              selected={createForm.permissionIds}
              onChange={(ids) => setCreateForm((f) => ({ ...f, permissionIds: ids }))}
            />
          </div>
          <Button
            size="sm"
            loading={createRole.isPending}
            disabled={!createForm.code || !createForm.name}
            onClick={submitCreate}
          >
            Tạo role
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-ink-muted">Đang tải...</p>
      ) : (
        <div className="flex flex-col gap-3">
          {roles?.map((role) => (
            <div key={role.id} className="rounded-3xl border border-border-soft bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{role.name}</p>
                    <StatusBadge tone={role.isSystem ? 'neutral' : 'success'}>
                      {role.isSystem ? 'System' : 'Tuỳ chỉnh'}
                    </StatusBadge>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {role.code} · {role.permissions.length} quyền · {role._count.users} người dùng
                  </p>
                  {role.description && <p className="mt-1 text-xs text-ink-muted">{role.description}</p>}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={role.isSystem}
                    title={role.isSystem ? 'Không thể sửa cấu trúc quyền của System Role' : undefined}
                    onClick={() => (editingId === role.id ? setEditingId(null) : startEdit(role))}
                  >
                    {editingId === role.id ? 'Đóng' : 'Sửa'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={role.isSystem || role._count.users > 0}
                    title={
                      role.isSystem
                        ? 'Không thể xoá System Role'
                        : role._count.users > 0
                          ? 'Vẫn còn user đang gán role này'
                          : undefined
                    }
                    onClick={async () => {
                      const ok = await confirmDialog(`Xoá role "${role.name}"? Hành động này không thể hoàn tác.`, {
                        title: 'Xoá role',
                        danger: true,
                      });
                      if (ok) deleteRole.mutate(role.id);
                    }}
                  >
                    Xoá
                  </Button>
                </div>
              </div>

              {!role.isSystem && editingId === role.id && (
                <div className="mt-5 border-t border-border-soft pt-5">
                  <div className="mb-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-ink-muted">Tên hiển thị</label>
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-ink-muted">Mô tả</label>
                      <input
                        value={editForm.description}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                        className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
                      />
                    </div>
                  </div>
                  <div className="mb-5">
                    <p className="mb-2 text-xs font-medium text-ink-muted">Permission</p>
                    <PermissionPicker
                      permissions={assignablePermissions ?? []}
                      selected={editForm.permissionIds}
                      onChange={(ids) => setEditForm((f) => ({ ...f, permissionIds: ids }))}
                    />
                  </div>
                  <Button size="sm" loading={updateRole.isPending} onClick={() => submitEdit(role.id)}>
                    Lưu thay đổi
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
