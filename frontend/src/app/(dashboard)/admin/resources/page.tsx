'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/Button';
import { IconFolder } from '@/components/admin/icons';
import { confirmDialog } from '@/store/useConfirmStore';
import {
  useFolders,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
} from '@/features/core/files/folders.hooks';
import type { Folder } from '@/features/core/files/folders.service';
import { useFiles, useUploadFile, useDeleteFile } from '@/features/core/files/files.hooks';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Cây thư mục tải dần từng cấp (lazy-load, KHÔNG tải hết cây cùng lúc) — mỗi node tự gọi API lấy con
// khi được mở rộng, khớp thiết kế backend GET /folders?parentId= (docs/06 §6b). "Thư mục gốc" là 1
// node giả (folderId = null), xử lý riêng ở component cha thay vì trong cây đệ quy này.
function FolderTreeNode({
  folder,
  depth,
  selectedId,
  onSelect,
}: {
  folder: Folder;
  depth: number;
  selectedId: string | null;
  onSelect: (folder: Folder) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = folder._count.folders > 0;
  const { data: children } = useFolders(folder.id, { enabled: expanded });

  return (
    <div>
      <div
        style={{ paddingLeft: depth * 16 }}
        onClick={() => onSelect(folder)}
        className={`flex cursor-pointer items-center gap-1.5 rounded-lg py-1.5 pr-2 text-sm ${
          selectedId === folder.id
            ? 'bg-rose-light font-medium text-rose-dark'
            : 'text-ink-soft hover:bg-ivory-50'
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] text-ink-muted ${
            hasChildren ? 'hover:bg-white' : 'invisible'
          }`}
        >
          {hasChildren ? (expanded ? '▾' : '▸') : null}
        </button>
        <span className="flex-1 truncate">{folder.name}</span>
        {folder._count.files > 0 && (
          <span className="text-[11px] text-ink-muted">{folder._count.files}</span>
        )}
      </div>
      {expanded && (children ?? []).length > 0 && (
        <div>
          {(children ?? []).map((child) => (
            <FolderTreeNode
              key={child.id}
              folder={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Màn quản lý tài nguyên — cây thư mục + xem file dạng lưới/danh sách (docs/12, Phase 4). API
// files/folders đã có sẵn đầy đủ từ trước (BE-19); đây thuần là màn UI mới, quyền `files.manage`
// (admin + super_admin đều có, xem core.seed.ts) đã được backend tự kiểm tra lại ở mọi request.
export default function ResourcesPage() {
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const selectedFolderId = selectedFolder?.id ?? null;

  const { data: rootFolders } = useFolders(undefined);
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();

  const { data: filesData, isLoading: filesLoading } = useFiles({
    folderId: selectedFolderId ?? undefined,
    view,
    page,
    limit: 24,
  });
  const uploadFile = useUploadFile();
  const deleteFile = useDeleteFile();

  function selectFolder(folder: Folder | null) {
    setSelectedFolder(folder);
    setPage(1);
    setRenaming(false);
    setCreatingFolder(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    // Tải lần lượt, KHÔNG Promise.all song song — presign của Cloudinary ký theo publicId ngẫu
    // nhiên riêng từng file nên song song vẫn đúng, nhưng làm tuần tự để tránh dội quá nhiều request
    // cùng lúc khi chọn nhiều ảnh lớn (kết nối chậm dễ time-out hàng loạt).
    for (const file of Array.from(files)) {
      await uploadFile.mutateAsync({ file, folderId: selectedFolderId }).catch(() => {});
    }
    e.target.value = '';
  }

  function submitCreateFolder() {
    if (!newFolderName.trim()) return;
    createFolder.mutate(
      { name: newFolderName.trim(), parentId: selectedFolderId },
      { onSuccess: () => { setCreatingFolder(false); setNewFolderName(''); } },
    );
  }

  function submitRename() {
    if (!selectedFolder || !renameValue.trim()) return;
    updateFolder.mutate(
      { id: selectedFolder.id, input: { name: renameValue.trim() } },
      { onSuccess: (updated) => { setSelectedFolder(updated); setRenaming(false); } },
    );
  }

  async function handleDeleteFolder() {
    if (!selectedFolder) return;
    const ok = await confirmDialog(
      `Xoá thư mục "${selectedFolder.name}"? Chỉ xoá được khi thư mục rỗng (không còn thư mục con hoặc file bên trong).`,
      { title: 'Xoá thư mục', danger: true },
    );
    if (ok) deleteFolder.mutate(selectedFolder.id, { onSuccess: () => selectFolder(null) });
  }

  async function handleDeleteFile(id: string) {
    const ok = await confirmDialog('Xoá file này? Hành động không thể hoàn tác.', {
      title: 'Xoá file',
      danger: true,
    });
    if (ok) deleteFile.mutate(id);
  }

  const files = filesData?.data ?? [];
  const meta = filesData?.meta;

  return (
    <div>
      <PageHeader
        title="Tài nguyên"
        description="Quản lý thư mục và file đã tải lên (ảnh sản phẩm, danh mục, avatar...)."
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full shrink-0 rounded-3xl border border-border-soft bg-white p-4 lg:w-64">
          <div
            onClick={() => selectFolder(null)}
            className={`mb-1 flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm ${
              selectedFolderId === null
                ? 'bg-rose-light font-medium text-rose-dark'
                : 'text-ink-soft hover:bg-ivory-50'
            }`}
          >
            <IconFolder className="h-4 w-4 shrink-0" />
            Thư mục gốc
          </div>

          {(rootFolders ?? []).map((folder) => (
            <FolderTreeNode
              key={folder.id}
              folder={folder}
              depth={1}
              selectedId={selectedFolderId}
              onSelect={selectFolder}
            />
          ))}

          <div className="mt-3 border-t border-border-soft pt-3">
            {creatingFolder ? (
              <div className="flex gap-1.5">
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitCreateFolder()}
                  placeholder="Tên thư mục"
                  className="w-full rounded-lg border border-border px-2.5 py-1.5 text-xs outline-none focus:border-rose focus:ring-1 focus:ring-rose"
                />
                <Button size="sm" loading={createFolder.isPending} onClick={submitCreateFolder}>
                  ✓
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreatingFolder(true)}
                className="text-xs font-medium text-rose hover:text-rose-dark"
              >
                + Thư mục mới {selectedFolder ? `trong "${selectedFolder.name}"` : 'ở gốc'}
              </button>
            )}
          </div>
        </aside>

        <div className="flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border-soft bg-white p-4">
            <div className="flex items-center gap-3">
              {renaming ? (
                <>
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitRename()}
                    className="rounded-lg border border-border px-2.5 py-1 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
                  />
                  <Button size="sm" loading={updateFolder.isPending} onClick={submitRename}>
                    Lưu
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRenaming(false)}>
                    Huỷ
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-ink">
                    {selectedFolder ? selectedFolder.name : 'Thư mục gốc'}
                  </p>
                  {selectedFolder && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setRenameValue(selectedFolder.name); setRenaming(true); }}
                        className="text-xs font-medium text-ink-muted hover:text-ink"
                      >
                        Đổi tên
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteFolder}
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Xoá thư mục
                      </button>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-full border border-border p-0.5">
                <button
                  type="button"
                  onClick={() => setView('grid')}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${view === 'grid' ? 'bg-rose text-white' : 'text-ink-muted'}`}
                >
                  Lưới
                </button>
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${view === 'list' ? 'bg-rose text-white' : 'text-ink-muted'}`}
                >
                  Danh sách
                </button>
              </div>
              <label className="inline-flex cursor-pointer items-center rounded-full bg-rose px-4 py-2 text-xs font-semibold text-white hover:bg-rose-dark">
                {uploadFile.isPending ? 'Đang tải lên...' : 'Tải ảnh lên'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  multiple
                  className="hidden"
                  onChange={handleUpload}
                />
              </label>
            </div>
          </div>

          {filesLoading ? (
            <p className="text-sm text-ink-muted">Đang tải...</p>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
              <IconFolder className="h-8 w-8 text-ink-muted" />
              <p className="text-sm text-ink-muted">Chưa có file nào trong thư mục này.</p>
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="group relative overflow-hidden rounded-2xl border border-border-soft bg-white"
                >
                  {file.mimeType.startsWith('image/') ? (
                    <div className="relative aspect-square">
                      <Image
                        src={file.url}
                        alt={file.originalName}
                        fill
                        sizes="200px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-ivory-50 text-xs font-medium text-ink-muted">
                      {file.mimeType.split('/')[1]?.toUpperCase() ?? 'FILE'}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteFile(file.id)}
                    className="absolute right-1.5 top-1.5 hidden rounded-full bg-ink/70 px-2 py-1 text-[10px] font-medium text-white group-hover:block"
                  >
                    Xoá
                  </button>
                  <p className="truncate px-2 py-1.5 text-[11px] text-ink-muted" title={file.originalName}>
                    {file.originalName}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-border-soft bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-left text-ink-muted">
                    <th className="px-4 py-3 font-medium"></th>
                    <th className="px-4 py-3 font-medium">Tên file</th>
                    <th className="px-4 py-3 font-medium">Loại</th>
                    <th className="px-4 py-3 font-medium">Kích thước</th>
                    <th className="px-4 py-3 font-medium">Ngày tải lên</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.id} className="border-b border-border-soft/70">
                      <td className="px-4 py-2.5">
                        {file.mimeType.startsWith('image/') ? (
                          <Image
                            src={file.url}
                            alt=""
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ivory-50 text-[9px] font-medium text-ink-muted">
                            {file.mimeType.split('/')[1]?.toUpperCase() ?? 'FILE'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-ink">{file.originalName}</td>
                      <td className="px-4 py-2.5 text-ink-muted">{file.mimeType}</td>
                      <td className="px-4 py-2.5 text-ink-muted">{formatBytes(file.sizeBytes)}</td>
                      <td className="px-4 py-2.5 text-ink-muted">
                        {new Date(file.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(file.id)}
                          className="text-xs font-semibold text-red-600 hover:text-red-700"
                        >
                          Xoá
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-ink-muted">
                Trang {meta.page}/{meta.totalPages} · {meta.total} file
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
