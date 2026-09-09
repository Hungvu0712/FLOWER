'use client';

import { useState } from 'react';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/features/domain/categories/categories.hooks';
import type { Category } from '@/features/domain/categories/categories.service';
import { useUploadFile } from '@/features/core/files/files.hooks';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { FlowerIcon } from '@/components/ui/FlowerIcon';
import { confirmDialog } from '@/store/useConfirmStore';

type FormState = {
  name: string;
  slug: string;
  description: string;
  imageFileId: string | null;
  parentId: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: '',
  slug: '',
  description: '',
  imageFileId: null,
  parentId: '',
  sortOrder: '0',
  isActive: true,
};

// Xếp danh mục con ngay dưới danh mục cha (thay vì để lẫn lộn theo sortOrder toàn cục) kèm depth để
// thụt lề hiển thị cây trực quan. Danh mục "mồ côi" (parentId trỏ tới id không có trong danh sách —
// không nên xảy ra do backend đã chặn, nhưng phòng hờ dữ liệu lạ) vẫn được thêm vào ở depth 0, không
// bị rớt khỏi danh sách.
function buildOrderedTree(categories: Category[]): (Category & { depth: number })[] {
  const byParent = new Map<string | null, Category[]>();
  for (const category of categories) {
    const key = category.parentId;
    const siblings = byParent.get(key) ?? [];
    siblings.push(category);
    byParent.set(key, siblings);
  }

  const result: (Category & { depth: number })[] = [];
  const visited = new Set<string>();

  function walk(parentId: string | null, depth: number) {
    for (const category of byParent.get(parentId) ?? []) {
      if (visited.has(category.id)) continue;
      visited.add(category.id);
      result.push({ ...category, depth });
      walk(category.id, depth + 1);
    }
  }
  walk(null, 0);

  for (const category of categories) {
    if (!visited.has(category.id)) result.push({ ...category, depth: 0 });
  }

  return result;
}

function toInput(form: FormState) {
  return {
    name: form.name,
    ...(form.slug && { slug: form.slug }),
    description: form.description || undefined,
    imageFileId: form.imageFileId,
    parentId: form.parentId || null,
    sortOrder: Number(form.sortOrder) || 0,
    isActive: form.isActive,
  };
}

// Danh mục con dạng cây (parentId tự tham chiếu) — ảnh qua imageFileId (module Files/R2 có sẵn), xem
// docs/05 §3.3. "categories.manage" là permission domain, admin/super_admin đều dùng được.
export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories({ includeInactive: true });
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const uploadFile = useUploadFile();

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [createImagePreview, setCreateImagePreview] = useState<string | null>(null);

  const categoryList = categories ?? [];
  const nameById = new Map(categoryList.map((c) => [c.id, c.name]));
  const orderedCategories = buildOrderedTree(categoryList);

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      imageFileId: category.imageFileId,
      parentId: category.parentId ?? '',
      sortOrder: String(category.sortOrder),
      isActive: category.isActive,
    });
    setEditImagePreview(category.imageFile?.url ?? null);
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>, target: 'create' | 'edit') {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploaded = await uploadFile.mutateAsync({ file });
    if (target === 'create') {
      setCreateForm((f) => ({ ...f, imageFileId: uploaded.id }));
      setCreateImagePreview(uploaded.url);
    } else {
      setEditForm((f) => ({ ...f, imageFileId: uploaded.id }));
      setEditImagePreview(uploaded.url);
    }
  }

  function submitCreate() {
    createCategory.mutate(toInput(createForm), {
      onSuccess: () => {
        setCreating(false);
        setCreateForm(emptyForm);
        setCreateImagePreview(null);
      },
    });
  }

  function submitEdit(id: string) {
    updateCategory.mutate({ id, input: toInput(editForm) }, { onSuccess: () => setEditingId(null) });
  }

  return (
    <div>
      <PageHeader
        title="Danh mục"
        description="Quản lý danh mục sản phẩm dạng cây. Không xoá được danh mục còn danh mục con."
        actions={
          <Button size="sm" variant={creating ? 'outline' : 'primary'} onClick={() => setCreating((v) => !v)}>
            {creating ? 'Đóng' : 'Tạo danh mục mới'}
          </Button>
        }
      />

      {creating && (
        <div className="mb-6 rounded-3xl border border-border-soft bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-ink">Danh mục mới</h2>

          <div className="mb-4 flex items-center gap-4">
            {createImagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={createImagePreview} alt="" className="h-16 w-16 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-light">
                <FlowerIcon className="h-7 w-7" color="var(--color-rose)" />
              </div>
            )}
            <label className="cursor-pointer text-sm font-medium text-rose hover:text-rose-dark">
              {uploadFile.isPending ? 'Đang tải ảnh lên...' : 'Chọn ảnh danh mục'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, 'create')} />
            </label>
          </div>

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Tên danh mục</label>
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Slug (tuỳ chọn — tự sinh từ tên)</label>
              <input
                value={createForm.slug}
                onChange={(e) => setCreateForm((f) => ({ ...f, slug: e.target.value }))}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
              />
            </div>
          </div>

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Danh mục cha (tuỳ chọn)</label>
              <select
                value={createForm.parentId}
                onChange={(e) => setCreateForm((f) => ({ ...f, parentId: e.target.value }))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
              >
                <option value="">— Không có (danh mục gốc) —</option>
                {categoryList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Thứ tự hiển thị</label>
              <input
                type="number"
                value={createForm.sortOrder}
                onChange={(e) => setCreateForm((f) => ({ ...f, sortOrder: e.target.value }))}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">Mô tả (tuỳ chọn)</label>
            <input
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
            />
          </div>

          <Button size="sm" loading={createCategory.isPending} disabled={!createForm.name} onClick={submitCreate}>
            Tạo danh mục
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-ink-muted">Đang tải...</p>
      ) : categoryList.length === 0 ? (
        <p className="text-sm text-ink-muted">Chưa có danh mục nào.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {orderedCategories.map((category) => (
            <div
              key={category.id}
              style={category.depth > 0 ? { marginLeft: category.depth * 28 } : undefined}
              className="rounded-3xl border border-border-soft bg-white p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-4">
                  {category.imageFile ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={category.imageFile.url} alt="" className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-light">
                      <FlowerIcon className="h-5 w-5" color="var(--color-rose)" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-ink">{category.name}</p>
                      <StatusBadge tone={category.isActive ? 'success' : 'neutral'}>
                        {category.isActive ? 'Hoạt động' : 'Đã ẩn'}
                      </StatusBadge>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      /{category.slug}
                      {category.parentId && <> · thuộc &quot;{nameById.get(category.parentId) ?? '—'}&quot;</>}
                      {category._count.children > 0 && <> · {category._count.children} danh mục con</>}
                    </p>
                    {category.description && <p className="mt-1 text-xs text-ink-muted">{category.description}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => (editingId === category.id ? setEditingId(null) : startEdit(category))}
                  >
                    {editingId === category.id ? 'Đóng' : 'Sửa'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={category._count.children > 0}
                    title={category._count.children > 0 ? 'Vẫn còn danh mục con' : undefined}
                    onClick={async () => {
                      const ok = await confirmDialog(
                        `Xoá danh mục "${category.name}"? Hành động này không thể hoàn tác.`,
                        { title: 'Xoá danh mục', danger: true },
                      );
                      if (ok) deleteCategory.mutate(category.id);
                    }}
                  >
                    Xoá
                  </Button>
                </div>
              </div>

              {editingId === category.id && (
                <div className="mt-5 border-t border-border-soft pt-5">
                  <div className="mb-4 flex items-center gap-4">
                    {editImagePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={editImagePreview} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-light">
                        <FlowerIcon className="h-7 w-7" color="var(--color-rose)" />
                      </div>
                    )}
                    <label className="cursor-pointer text-sm font-medium text-rose hover:text-rose-dark">
                      {uploadFile.isPending ? 'Đang tải ảnh lên...' : 'Đổi ảnh'}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, 'edit')} />
                    </label>
                  </div>

                  <div className="mb-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-ink-muted">Tên danh mục</label>
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-ink-muted">Slug</label>
                      <input
                        value={editForm.slug}
                        onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
                        className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
                      />
                    </div>
                  </div>

                  <div className="mb-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-ink-muted">Danh mục cha</label>
                      <select
                        value={editForm.parentId}
                        onChange={(e) => setEditForm((f) => ({ ...f, parentId: e.target.value }))}
                        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
                      >
                        <option value="">— Không có (danh mục gốc) —</option>
                        {categoryList
                          .filter((c) => c.id !== category.id)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-ink-muted">Thứ tự hiển thị</label>
                      <input
                        type="number"
                        value={editForm.sortOrder}
                        onChange={(e) => setEditForm((f) => ({ ...f, sortOrder: e.target.value }))}
                        className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
                      />
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="mb-1.5 block text-xs font-medium text-ink-muted">Mô tả</label>
                    <input
                      value={editForm.description}
                      onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
                    />
                  </div>

                  <div className="mb-5 flex items-center justify-between rounded-2xl border border-border-soft px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink">Hiển thị trên storefront</p>
                      <p className="text-xs text-ink-muted">Tắt để ẩn tạm danh mục mà không cần xoá.</p>
                    </div>
                    <Switch
                      checked={editForm.isActive}
                      onChange={() => setEditForm((f) => ({ ...f, isActive: !f.isActive }))}
                      label="Hiển thị trên storefront"
                    />
                  </div>

                  <Button size="sm" loading={updateCategory.isPending} onClick={() => submitEdit(category.id)}>
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
