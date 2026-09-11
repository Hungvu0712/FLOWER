'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { foldersService, type CreateFolderInput, type UpdateFolderInput } from './folders.service';
import { useToastStore } from '@/store/useToastStore';
import { getErrorMessage } from '@/lib/errors';

// `enabled` — cây thư mục tải dần từng cấp: chỉ gọi API lấy thư mục con khi node cha thật sự được mở
// rộng (expanded), không tải sẵn toàn bộ cây. `parentId` bỏ trống LUÔN nghĩa là cấp gốc (không phải
// "chưa xác định") nên cần cờ `enabled` riêng để tắt/bật query, không dùng parentId undefined cho việc đó.
export function useFolders(parentId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['folders', parentId ?? 'root'],
    queryFn: () => foldersService.list(parentId),
    enabled: options?.enabled ?? true,
  });
}

function useInvalidateFolders() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['folders'] });
}

export function useCreateFolder() {
  const invalidate = useInvalidateFolders();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: (input: CreateFolderInput) => foldersService.create(input),
    onSuccess: () => {
      invalidate();
      push('Đã tạo thư mục');
    },
    onError: (error) => push(getErrorMessage(error, 'Không tạo được thư mục'), 'error'),
  });
}

export function useUpdateFolder() {
  const invalidate = useInvalidateFolders();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFolderInput }) =>
      foldersService.update(id, input),
    onSuccess: () => {
      invalidate();
      push('Đã lưu thay đổi');
    },
    onError: (error) => push(getErrorMessage(error, 'Không lưu được thay đổi'), 'error'),
  });
}

export function useDeleteFolder() {
  const invalidate = useInvalidateFolders();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: (id: string) => foldersService.remove(id),
    onSuccess: () => {
      invalidate();
      push('Đã xoá thư mục');
    },
    onError: (error) => push(getErrorMessage(error, 'Không xoá được thư mục'), 'error'),
  });
}
