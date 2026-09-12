'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { blogService, type UpdateBlogPostInput } from './blog.service';
import { useToastStore } from '@/store/useToastStore';
import { getErrorMessage } from '@/lib/errors';

export function useBlogPosts(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'blog', params ?? null],
    queryFn: () => blogService.listAdmin(params),
  });
}

function useInvalidateBlogPosts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['admin', 'blog'] });
}

export function useCreateBlogPost() {
  const invalidate = useInvalidateBlogPosts();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: blogService.create,
    onSuccess: () => {
      invalidate();
      push('Đã tạo bài viết');
    },
    onError: (error) => push(getErrorMessage(error, 'Không tạo được bài viết'), 'error'),
  });
}

export function useUpdateBlogPost() {
  const invalidate = useInvalidateBlogPosts();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBlogPostInput }) =>
      blogService.update(id, input),
    onSuccess: () => {
      invalidate();
      push('Đã lưu thay đổi');
    },
    onError: (error) => push(getErrorMessage(error, 'Không lưu được thay đổi'), 'error'),
  });
}

export function useDeleteBlogPost() {
  const invalidate = useInvalidateBlogPosts();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: blogService.remove,
    onSuccess: () => {
      invalidate();
      push('Đã xoá bài viết');
    },
    onError: (error) => push(getErrorMessage(error, 'Không xoá được bài viết'), 'error'),
  });
}
