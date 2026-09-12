'use client';

import { useState } from 'react';
import {
  useOccasions,
  useCreateOccasion,
  useUpdateOccasion,
  useDeleteOccasion,
} from '@/features/domain/occasions/occasions.hooks';
import type { Occasion } from '@/features/domain/occasions/occasions.service';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { confirmDialog } from '@/store/useConfirmStore';

type FormState = {
  name: string;
  slug: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm: FormState = { name: '', slug: '', sortOrder: '0', isActive: true };

function toInput(form: FormState) {
  return {
    name: form.name,
    ...(form.slug && { slug: form.slug }),
    sortOrder: Number(form.sortOrder) || 0,
    isActive: form.isActive,
  };
}

// Tag dịp lễ (Sinh nhật, Valentine, Khai trương...) — KHÁC categories: phẳng (không cây cha-con), 1
// sản phẩm gắn được NHIỀU dịp lễ cùng lúc (chọn ở form sản phẩm, xem admin/products/page.tsx). Dùng
// LẠI permission "categories.manage" (không tách occasions.manage riêng) — xem docs/05 §3.4,
// docs/modules/domain-occasions.md.
export default function OccasionsPage() {
  const { data: occasions, isLoading } = useOccasions({ includeInactive: true });
  const createOccasion = useCreateOccasion();
  const updateOccasion = useUpdateOccasion();
  const deleteOccasion = useDeleteOccasion();

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);

  const occasionList = occasions ?? [];

  function startEdit(occasion: Occasion) {
    setEditingId(occasion.id);
    setEditForm({
      name: occasion.name,
      slug: occasion.slug,
      sortOrder: String(occasion.sortOrder),
      isActive: occasion.isActive,
    });
  }

  function submitCreate() {
    createOccasion.mutate(toInput(createForm), {
      onSuccess: () => {
        setCreating(false);
        setCreateForm(emptyForm);
      },
    });
  }

  function submitEdit(id: string) {
    updateOccasion.mutate(
      { id, input: toInput(editForm) },
      { onSuccess: () => setEditingId(null) },
    );
  }

  return (
    <div>
      <PageHeader
        title="Dịp lễ"
        description="Quản lý các dịp lễ (Sinh nhật, Valentine, Khai trương...) để gắn tag cho sản phẩm."
        actions={
          <Button
            size="sm"
            variant={creating ? 'outline' : 'primary'}
            onClick={() => setCreating((v) => !v)}
          >
            {creating ? 'Đóng' : 'Tạo dịp lễ mới'}
          </Button>
        }
      />

      {creating && (
        <div className="mb-6 rounded-3xl border border-border-soft bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-ink">Dịp lễ mới</h2>

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Tên dịp lễ</label>
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">
                Slug (tuỳ chọn — tự sinh từ tên)
              </label>
              <input
                value={createForm.slug}
                onChange={(e) => setCreateForm((f) => ({ ...f, slug: e.target.value }))}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">
              Thứ tự hiển thị
            </label>
            <input
              type="number"
              value={createForm.sortOrder}
              onChange={(e) => setCreateForm((f) => ({ ...f, sortOrder: e.target.value }))}
              className="w-40 rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
            />
          </div>

          <Button
            size="sm"
            loading={createOccasion.isPending}
            disabled={!createForm.name}
            onClick={submitCreate}
          >
            Tạo dịp lễ
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-ink-muted">Đang tải...</p>
      ) : occasionList.length === 0 ? (
        <p className="text-sm text-ink-muted">Chưa có dịp lễ nào.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {occasionList.map((occasion) => (
            <div key={occasion.id} className="rounded-3xl border border-border-soft bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{occasion.name}</p>
                    <StatusBadge tone={occasion.isActive ? 'success' : 'neutral'}>
                      {occasion.isActive ? 'Hoạt động' : 'Đã ẩn'}
                    </StatusBadge>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">/{occasion.slug}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      editingId === occasion.id ? setEditingId(null) : startEdit(occasion)
                    }
                  >
                    {editingId === occasion.id ? 'Đóng' : 'Sửa'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      const confirmed = await confirmDialog(
                        `Xoá dịp lễ "${occasion.name}"? Sản phẩm đang gắn dịp lễ này sẽ bị gỡ tag (không ảnh hưởng gì khác).`,
                        { title: 'Xoá dịp lễ', danger: true },
                      );
                      if (confirmed) deleteOccasion.mutate(occasion.id);
                    }}
                  >
                    Xoá
                  </Button>
                </div>
              </div>

              {editingId === occasion.id && (
                <div className="mt-5 border-t border-border-soft pt-5">
                  <div className="mb-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-ink-muted">
                        Tên dịp lễ
                      </label>
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-ink-muted">
                        Slug
                      </label>
                      <input
                        value={editForm.slug}
                        onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
                        className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
                      />
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="mb-1.5 block text-xs font-medium text-ink-muted">
                      Thứ tự hiển thị
                    </label>
                    <input
                      type="number"
                      value={editForm.sortOrder}
                      onChange={(e) => setEditForm((f) => ({ ...f, sortOrder: e.target.value }))}
                      className="w-40 rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
                    />
                  </div>

                  <div className="mb-5 flex items-center justify-between rounded-2xl border border-border-soft px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink">Hiển thị trên storefront</p>
                      <p className="text-xs text-ink-muted">
                        Tắt để ẩn tạm dịp lễ mà không cần xoá.
                      </p>
                    </div>
                    <Switch
                      checked={editForm.isActive}
                      onChange={() => setEditForm((f) => ({ ...f, isActive: !f.isActive }))}
                      label="Hiển thị trên storefront"
                    />
                  </div>

                  <Button
                    size="sm"
                    loading={updateOccasion.isPending}
                    onClick={() => submitEdit(occasion.id)}
                  >
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
