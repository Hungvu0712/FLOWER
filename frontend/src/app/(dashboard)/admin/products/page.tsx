'use client';

import { useState } from 'react';
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '@/features/domain/products/products.hooks';
import type { Product } from '@/features/domain/products/products.service';
import { useCategories } from '@/features/domain/categories/categories.hooks';
import type { Category } from '@/features/domain/categories/categories.service';
import { useUploadFile } from '@/features/core/files/files.hooks';
import { formatVnd } from '@/lib/currency';
import { stripHtml } from '@/lib/html';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { FlowerIcon } from '@/components/ui/FlowerIcon';
import { confirmDialog } from '@/store/useConfirmStore';

type ImageDraft = { fileId: string; url: string };

type FormState = {
  name: string;
  slug: string;
  description: string;
  basePrice: string;
  categoryId: string;
  isActive: boolean;
  images: ImageDraft[];
};

const emptyForm: FormState = {
  name: '',
  slug: '',
  description: '',
  basePrice: '',
  categoryId: '',
  isActive: true,
  images: [],
};

function toInput(form: FormState) {
  return {
    name: form.name,
    ...(form.slug && { slug: form.slug }),
    description: form.description || undefined,
    basePrice: Number(form.basePrice) || 0,
    categoryId: form.categoryId || null,
    isActive: form.isActive,
    imageFileIds: form.images.map((img) => img.fileId),
  };
}

function ImageGallery({ images, onRemove }: { images: ImageDraft[]; onRemove: (fileId: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {images.map((img) => (
        <div key={img.fileId} className="group relative h-16 w-16 overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onRemove(img.fileId)}
            className="absolute inset-0 flex items-center justify-center bg-ink/60 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            Gỡ
          </button>
        </div>
      ))}
      {images.length === 0 && (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-light">
          <FlowerIcon className="h-6 w-6" color="var(--color-rose)" />
        </div>
      )}
    </div>
  );
}

function ProductForm({
  form,
  setForm,
  categoryList,
  uploading,
  onAddImages,
  onRemoveImage,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  categoryList: Category[];
  uploading: boolean;
  onAddImages: (files: File[]) => void;
  onRemoveImage: (fileId: string) => void;
}) {
  return (
    <>
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-ink-muted">Ảnh sản phẩm</label>
        <div className="flex items-center gap-4">
          <ImageGallery images={form.images} onRemove={onRemoveImage} />
          <label className="cursor-pointer text-sm font-medium text-rose hover:text-rose-dark">
            {uploading ? 'Đang tải ảnh lên...' : 'Thêm ảnh'}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = ''; // cho phép chọn lại đúng file vừa chọn
                onAddImages(files);
              }}
            />
          </label>
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Tên sản phẩm</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Slug (tuỳ chọn — tự sinh từ tên)</label>
          <input
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
          />
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Giá (VND)</label>
          <input
            type="number"
            min={0}
            value={form.basePrice}
            onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Danh mục (tuỳ chọn)</label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
          >
            <option value="">— Không có —</option>
            {categoryList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-5">
        <label className="mb-1.5 block text-xs font-medium text-ink-muted">Mô tả (tuỳ chọn)</label>
        <RichTextEditor
          value={form.description}
          onChange={(html) => setForm((f) => ({ ...f, description: html }))}
          placeholder="Thành phần hoa, kích thước, dịp phù hợp..."
        />
      </div>

      <div className="mb-5 flex items-center justify-between rounded-2xl border border-border-soft px-4 py-3">
        <div>
          <p className="text-sm font-medium text-ink">Hiển thị trên storefront</p>
          <p className="text-xs text-ink-muted">Tắt để ẩn tạm sản phẩm mà không cần xoá.</p>
        </div>
        <Switch checked={form.isActive} onChange={() => setForm((f) => ({ ...f, isActive: !f.isActive }))} label="Hiển thị trên storefront" />
      </div>
    </>
  );
}

// Sản phẩm — giá quản lý trực tiếp trên sản phẩm, KHÔNG có tồn kho (hoa tươi làm theo đơn, chưa có
// product_variants theo size, xem docs/05 §3.4). Ảnh là thư viện nhiều ảnh (product_images, khác
// categories chỉ 1 ảnh đại diện) —
// gửi lại toàn bộ danh sách imageFileIds ở update là THAY THẾ bộ ảnh cũ, không phải thêm vào (xem
// products.service.ts). "products.manage" là permission domain gộp chung (view/create/update/delete),
// khác thiết kế ban đầu tách 4 permission — admin/super_admin đều dùng được.
export default function ProductsPage() {
  const { data, isLoading } = useProducts({ includeInactive: true, limit: 100 });
  const { data: categories } = useCategories({ includeInactive: true });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const uploadFile = useUploadFile();

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);

  const products = data?.data ?? [];
  const categoryList = categories ?? [];
  const categoryNameById = new Map(categoryList.map((c) => [c.id, c.name]));

  function startEdit(product: Product) {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      slug: product.slug,
      description: product.description ?? '',
      basePrice: String(product.basePrice),
      categoryId: product.categoryId ?? '',
      isActive: product.isActive,
      images: product.images.map((img) => ({ fileId: img.file.id, url: img.file.url })),
    });
  }

  async function handleAddImages(files: File[], target: 'create' | 'edit') {
    for (const file of files) {
      const uploaded = await uploadFile.mutateAsync({ file });
      const draft: ImageDraft = { fileId: uploaded.id, url: uploaded.url };
      if (target === 'create') setCreateForm((f) => ({ ...f, images: [...f.images, draft] }));
      else setEditForm((f) => ({ ...f, images: [...f.images, draft] }));
    }
  }

  function removeImage(target: 'create' | 'edit', fileId: string) {
    if (target === 'create') setCreateForm((f) => ({ ...f, images: f.images.filter((i) => i.fileId !== fileId) }));
    else setEditForm((f) => ({ ...f, images: f.images.filter((i) => i.fileId !== fileId) }));
  }

  function submitCreate() {
    createProduct.mutate(toInput(createForm), {
      onSuccess: () => {
        setCreating(false);
        setCreateForm(emptyForm);
      },
    });
  }

  function submitEdit(id: string) {
    updateProduct.mutate({ id, input: toInput(editForm) }, { onSuccess: () => setEditingId(null) });
  }

  return (
    <div>
      <PageHeader
        title="Sản phẩm"
        description="Quản lý sản phẩm hoa: giá, danh mục và ảnh."
        actions={
          <Button size="sm" variant={creating ? 'outline' : 'primary'} onClick={() => setCreating((v) => !v)}>
            {creating ? 'Đóng' : 'Tạo sản phẩm mới'}
          </Button>
        }
      />

      {creating && (
        <div className="mb-6 rounded-3xl border border-border-soft bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-ink">Sản phẩm mới</h2>
          <ProductForm
            form={createForm}
            setForm={setCreateForm}
            categoryList={categoryList}
            uploading={uploadFile.isPending}
            onAddImages={(files) => handleAddImages(files, 'create')}
            onRemoveImage={(fileId) => removeImage('create', fileId)}
          />
          <Button
            size="sm"
            loading={createProduct.isPending}
            disabled={!createForm.name || !createForm.basePrice}
            onClick={submitCreate}
          >
            Tạo sản phẩm
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-ink-muted">Đang tải...</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-ink-muted">Chưa có sản phẩm nào.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {products.map((product) => (
            <div key={product.id} className="rounded-3xl border border-border-soft bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-4">
                  {product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.images[0].file.url} alt="" className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-light">
                      <FlowerIcon className="h-5 w-5" color="var(--color-rose)" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-ink">{product.name}</p>
                      <StatusBadge tone={product.isActive ? 'success' : 'neutral'}>
                        {product.isActive ? 'Hoạt động' : 'Đã ẩn'}
                      </StatusBadge>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      /{product.slug} · {formatVnd(product.basePrice)}
                      {product.categoryId && <> · {categoryNameById.get(product.categoryId) ?? '—'}</>}
                    </p>
                    {product.description && (
                      <p className="mt-1 text-xs text-ink-muted">{stripHtml(product.description)}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => (editingId === product.id ? setEditingId(null) : startEdit(product))}
                  >
                    {editingId === product.id ? 'Đóng' : 'Sửa'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      const confirmed = await confirmDialog(`Xoá sản phẩm "${product.name}"? Hành động này không thể hoàn tác.`, {
                        title: 'Xoá sản phẩm',
                        danger: true,
                      });
                      if (confirmed) deleteProduct.mutate(product.id);
                    }}
                  >
                    Xoá
                  </Button>
                </div>
              </div>

              {editingId === product.id && (
                <div className="mt-5 border-t border-border-soft pt-5">
                  <ProductForm
                    form={editForm}
                    setForm={setEditForm}
                    categoryList={categoryList}
                    uploading={uploadFile.isPending}
                    onAddImages={(files) => handleAddImages(files, 'edit')}
                    onRemoveImage={(fileId) => removeImage('edit', fileId)}
                  />
                  <Button size="sm" loading={updateProduct.isPending} onClick={() => submitEdit(product.id)}>
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
