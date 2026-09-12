'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  useBlogPosts,
  useCreateBlogPost,
  useUpdateBlogPost,
  useDeleteBlogPost,
} from '@/features/domain/blog/blog.hooks';
import type { BlogPost } from '@/features/domain/blog/blog.service';
import { useUploadFile } from '@/features/core/files/files.hooks';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { FlowerIcon } from '@/components/ui/FlowerIcon';
import { confirmDialog } from '@/store/useConfirmStore';

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  thumbnailFileId: string | null;
  // null = draft. Có giá trị = đã xuất bản tại đúng thời điểm đó — GIỮ NGUYÊN ngày xuất bản gốc khi
  // sửa bài đã published (không reset về "now" mỗi lần lưu chỉnh sửa nhỏ), chỉ đặt "now" khi CHUYỂN
  // từ draft sang xuất bản lần đầu (xem toggle ở BlogForm bên dưới).
  publishedAt: string | null;
};

const emptyForm: FormState = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  thumbnailFileId: null,
  publishedAt: null,
};

function toInput(form: FormState) {
  return {
    title: form.title,
    ...(form.slug && { slug: form.slug }),
    excerpt: form.excerpt || undefined,
    content: form.content,
    thumbnailFileId: form.thumbnailFileId,
    publishedAt: form.publishedAt,
  };
}

// Bài viết blog — permission `blog.manage` (chỉ admin/super_admin, dùng LẠI permission có sẵn cùng
// nhóm "Nội dung" với Newsletter — xem docs/05-database-va-rbac.md §2.4). publishedAt null = draft,
// có giá trị = đã xuất bản — xem docs/modules/domain-blog.md.
export default function BlogPage() {
  const { data, isLoading } = useBlogPosts({ limit: 100 });
  const createPost = useCreateBlogPost();
  const updatePost = useUpdateBlogPost();
  const deletePost = useDeleteBlogPost();
  const uploadFile = useUploadFile();

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [createThumbPreview, setCreateThumbPreview] = useState<string | null>(null);
  const [editThumbPreview, setEditThumbPreview] = useState<string | null>(null);

  const posts = data?.data ?? [];

  function startEdit(post: BlogPost) {
    setEditingId(post.id);
    setEditForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? '',
      content: post.content,
      thumbnailFileId: post.thumbnailFile?.id ?? null,
      publishedAt: post.publishedAt,
    });
    setEditThumbPreview(post.thumbnailFile?.url ?? null);
  }

  async function handleThumbnailChange(
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'create' | 'edit',
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploaded = await uploadFile.mutateAsync({ file });
    if (target === 'create') {
      setCreateForm((f) => ({ ...f, thumbnailFileId: uploaded.id }));
      setCreateThumbPreview(uploaded.url);
    } else {
      setEditForm((f) => ({ ...f, thumbnailFileId: uploaded.id }));
      setEditThumbPreview(uploaded.url);
    }
  }

  function submitCreate() {
    createPost.mutate(toInput(createForm), {
      onSuccess: () => {
        setCreating(false);
        setCreateForm(emptyForm);
        setCreateThumbPreview(null);
      },
    });
  }

  function submitEdit(id: string) {
    updatePost.mutate({ id, input: toInput(editForm) }, { onSuccess: () => setEditingId(null) });
  }

  return (
    <div>
      <PageHeader
        title="Blog"
        description="Quản lý bài viết blog hiển thị ở trang /blog."
        actions={
          <Button
            size="sm"
            variant={creating ? 'outline' : 'primary'}
            onClick={() => setCreating((v) => !v)}
          >
            {creating ? 'Đóng' : 'Viết bài mới'}
          </Button>
        }
      />

      {creating && (
        <div className="mb-6 rounded-3xl border border-border-soft bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-ink">Bài viết mới</h2>
          <BlogForm
            form={createForm}
            setForm={setCreateForm}
            thumbPreview={createThumbPreview}
            onThumbnailChange={(e) => handleThumbnailChange(e, 'create')}
            uploadPending={uploadFile.isPending}
          />
          <Button
            size="sm"
            loading={createPost.isPending}
            disabled={!createForm.title || !createForm.content}
            onClick={submitCreate}
          >
            Lưu bài viết
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-ink-muted">Đang tải...</p>
      ) : posts.length === 0 ? (
        <p className="text-sm text-ink-muted">Chưa có bài viết nào.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((post) => (
            <div key={post.id} className="rounded-3xl border border-border-soft bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {post.thumbnailFile ? (
                    <Image
                      src={post.thumbnailFile.url}
                      alt=""
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-light">
                      <FlowerIcon className="h-6 w-6" color="var(--color-rose)" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-ink">{post.title}</p>
                      <StatusBadge tone={post.publishedAt ? 'success' : 'neutral'}>
                        {post.publishedAt ? 'Đã xuất bản' : 'Draft'}
                      </StatusBadge>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      /{post.slug}
                      {post.author && ` · ${post.author.fullName}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => (editingId === post.id ? setEditingId(null) : startEdit(post))}
                  >
                    {editingId === post.id ? 'Đóng' : 'Sửa'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      const confirmed = await confirmDialog(`Xoá bài viết "${post.title}"?`, {
                        title: 'Xoá bài viết',
                        danger: true,
                      });
                      if (confirmed) deletePost.mutate(post.id);
                    }}
                  >
                    Xoá
                  </Button>
                </div>
              </div>

              {editingId === post.id && (
                <div className="mt-5 border-t border-border-soft pt-5">
                  <BlogForm
                    form={editForm}
                    setForm={setEditForm}
                    thumbPreview={editThumbPreview}
                    onThumbnailChange={(e) => handleThumbnailChange(e, 'edit')}
                    uploadPending={uploadFile.isPending}
                  />
                  <Button
                    size="sm"
                    loading={updatePost.isPending}
                    onClick={() => submitEdit(post.id)}
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

function BlogForm({
  form,
  setForm,
  thumbPreview,
  onThumbnailChange,
  uploadPending,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  thumbPreview: string | null;
  onThumbnailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadPending: boolean;
}) {
  return (
    <>
      <div className="mb-4 flex items-center gap-4">
        {thumbPreview ? (
          <Image
            src={thumbPreview}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-light">
            <FlowerIcon className="h-7 w-7" color="var(--color-rose)" />
          </div>
        )}
        <label className="cursor-pointer text-sm font-medium text-rose hover:text-rose-dark">
          {uploadPending ? 'Đang tải ảnh lên...' : 'Chọn ảnh đại diện'}
          <input type="file" accept="image/*" className="hidden" onChange={onThumbnailChange} />
        </label>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Tiêu đề</label>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">
            Slug (tuỳ chọn — tự sinh từ tiêu đề)
          </label>
          <input
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-ink-muted">
          Tóm tắt (hiện ở trang danh sách)
        </label>
        <input
          value={form.excerpt}
          onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
          maxLength={300}
          className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
        />
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-ink-muted">Nội dung</label>
        <RichTextEditor
          value={form.content}
          onChange={(content) => setForm((f) => ({ ...f, content }))}
          placeholder="Viết nội dung bài blog..."
        />
      </div>

      <div className="mb-5 flex items-center justify-between rounded-2xl border border-border-soft px-4 py-3">
        <div>
          <p className="text-sm font-medium text-ink">Xuất bản</p>
          <p className="text-xs text-ink-muted">Tắt để lưu dạng nháp (draft), chỉ admin thấy.</p>
        </div>
        <Switch
          checked={!!form.publishedAt}
          onChange={() =>
            setForm((f) => ({
              ...f,
              publishedAt: f.publishedAt ? null : new Date().toISOString(),
            }))
          }
          label="Xuất bản"
        />
      </div>
    </>
  );
}
