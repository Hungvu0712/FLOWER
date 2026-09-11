'use client';

import { useState } from 'react';
import {
  useAdminPermissions,
  useCreatePermission,
  useUpdatePermission,
  useDeletePermission,
} from '@/features/core/admin-permissions/permissions.hooks';
import type { Permission } from '@/features/core/admin-permissions/permissions.service';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { confirmDialog } from '@/store/useConfirmStore';

type FormState = { code: string; groupName: string; description: string };
const emptyForm: FormState = { code: '', groupName: '', description: '' };

// Permission mới tạo qua trang này chỉ là dữ liệu — nó KHÔNG tự chặn được request nào cho tới khi có
// route backend thật sự gọi authorize('code-này'). Xem permissions.service.ts (backend), docs/07 §2.
export default function PermissionsPage() {
  const { data: permissions, isLoading } = useAdminPermissions();
  const createPermission = useCreatePermission();
  const updatePermission = useUpdatePermission();
  const deletePermission = useDeletePermission();

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);

  const groups = new Map<string, Permission[]>();
  for (const p of permissions ?? []) {
    const list = groups.get(p.groupName) ?? [];
    list.push(p);
    groups.set(p.groupName, list);
  }

  function startEdit(p: Permission) {
    setEditingId(p.id);
    setEditForm({ code: p.code, groupName: p.groupName, description: p.description ?? '' });
  }

  function submitCreate() {
    createPermission.mutate(
      {
        code: createForm.code,
        groupName: createForm.groupName,
        ...(createForm.description && { description: createForm.description }),
      },
      {
        onSuccess: () => {
          setCreating(false);
          setCreateForm(emptyForm);
        },
      },
    );
  }

  function submitEdit(p: Permission) {
    updatePermission.mutate(
      {
        id: p.id,
        input: {
          ...(!p.isSystem && { code: editForm.code }),
          groupName: editForm.groupName,
          description: editForm.description,
        },
      },
      { onSuccess: () => setEditingId(null) },
    );
  }

  return (
    <div>
      <PageHeader
        title="Permission"
        description="Danh sách quyền hạn dùng để gán cho role. Permission hệ thống (đã có route tham chiếu trong code) không thể đổi code hoặc xoá."
        actions={
          <Button
            size="sm"
            variant={creating ? 'outline' : 'primary'}
            onClick={() => setCreating((v) => !v)}
          >
            {creating ? 'Đóng' : 'Tạo permission mới'}
          </Button>
        }
      />

      {creating && (
        <div className="mb-6 rounded-3xl border border-border-soft bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-ink">Permission mới</h2>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">
                Code (dạng &quot;group.action&quot;, vd products.export)
              </label>
              <input
                value={createForm.code}
                onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value }))}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">
                Nhóm (groupName)
              </label>
              <input
                value={createForm.groupName}
                onChange={(e) => setCreateForm((f) => ({ ...f, groupName: e.target.value }))}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
              />
            </div>
          </div>
          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">
              Mô tả (tuỳ chọn)
            </label>
            <input
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
            />
          </div>
          <Button
            size="sm"
            loading={createPermission.isPending}
            disabled={!createForm.code || !createForm.groupName}
            onClick={submitCreate}
          >
            Tạo permission
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-ink-muted">Đang tải...</p>
      ) : (
        <div className="flex flex-col gap-6">
          {[...groups.entries()].map(([group, perms]) => (
            <div key={group}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                {group}
              </p>
              <div className="flex flex-col gap-3">
                {perms.map((p) => (
                  <div key={p.id} className="rounded-3xl border border-border-soft bg-white p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm font-semibold text-ink">{p.code}</p>
                          {p.isSystem && <StatusBadge tone="neutral">System</StatusBadge>}
                          {p.isRestricted && <StatusBadge tone="warning">Hạn chế</StatusBadge>}
                        </div>
                        {p.description && (
                          <p className="mt-1 text-xs text-ink-muted">{p.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => (editingId === p.id ? setEditingId(null) : startEdit(p))}
                        >
                          {editingId === p.id ? 'Đóng' : 'Sửa'}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={p.isSystem}
                          title={p.isSystem ? 'Permission hệ thống không thể xoá' : undefined}
                          onClick={async () => {
                            const ok = await confirmDialog(
                              `Xoá permission "${p.code}"? Hành động này không thể hoàn tác.`,
                              { title: 'Xoá permission', danger: true },
                            );
                            if (ok) deletePermission.mutate(p.id);
                          }}
                        >
                          Xoá
                        </Button>
                      </div>
                    </div>

                    {editingId === p.id && (
                      <div className="mt-5 border-t border-border-soft pt-5">
                        <div className="mb-4 grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-ink-muted">
                              Code {p.isSystem && '(khoá — permission hệ thống)'}
                            </label>
                            <input
                              value={editForm.code}
                              disabled={p.isSystem}
                              onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))}
                              className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose disabled:bg-ivory-50 disabled:text-ink-muted"
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-ink-muted">
                              Nhóm (groupName)
                            </label>
                            <input
                              value={editForm.groupName}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, groupName: e.target.value }))
                              }
                              className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
                            />
                          </div>
                        </div>
                        <div className="mb-5">
                          <label className="mb-1.5 block text-xs font-medium text-ink-muted">
                            Mô tả
                          </label>
                          <input
                            value={editForm.description}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, description: e.target.value }))
                            }
                            className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
                          />
                        </div>
                        <Button
                          size="sm"
                          loading={updatePermission.isPending}
                          onClick={() => submitEdit(p)}
                        >
                          Lưu thay đổi
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
