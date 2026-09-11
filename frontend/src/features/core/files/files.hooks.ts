'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { filesService } from './files.service';

export function useUploadFile() {
  return useMutation({
    mutationFn: ({ file, folderId }: { file: File; folderId?: string | null }) =>
      filesService.upload(file, folderId),
  });
}

export function useFiles(folderId?: string, view: 'grid' | 'list' = 'grid') {
  return useQuery({
    queryKey: ['files', folderId, view],
    queryFn: () => filesService.list(folderId, view),
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: filesService.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['files'] }),
  });
}
