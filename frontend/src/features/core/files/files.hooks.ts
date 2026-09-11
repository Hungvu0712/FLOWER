'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { filesService, type ListFilesParams } from './files.service';
import { useToastStore } from '@/store/useToastStore';
import { getErrorMessage } from '@/lib/errors';

export function useUploadFile() {
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ file, folderId }: { file: File; folderId?: string | null }) =>
      filesService.upload(file, folderId),
    // products/categories/profile dùng thẳng kết quả mutation (không đọc lại danh sách) nên vô hại;
    // màn quản lý tài nguyên cần danh sách tự cập nhật ngay sau khi tải ảnh lên.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['files'] }),
    onError: (error) => push(getErrorMessage(error, 'Không tải được ảnh lên'), 'error'),
  });
}

export function useFiles(params: ListFilesParams = {}) {
  const { folderId, view = 'grid', page = 1, limit = 24 } = params;
  return useQuery({
    queryKey: ['files', folderId ?? 'root', view, page, limit],
    queryFn: () => filesService.list(params),
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: filesService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      push('Đã xoá file');
    },
    onError: (error) => push(getErrorMessage(error, 'Không xoá được file'), 'error'),
  });
}
