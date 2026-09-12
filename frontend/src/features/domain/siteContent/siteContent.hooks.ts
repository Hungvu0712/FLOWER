'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { siteContentService, type SiteContentKey } from './siteContent.service';
import { useToastStore } from '@/store/useToastStore';
import { getErrorMessage } from '@/lib/errors';

export function useSiteContentAdmin() {
  return useQuery({ queryKey: ['admin', 'site-content'], queryFn: siteContentService.list });
}

export function useUpdateSiteContent() {
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ key, value }: { key: SiteContentKey; value: unknown }) =>
      siteContentService.update(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'site-content'] });
      push('Đã lưu thay đổi');
    },
    onError: (error) => push(getErrorMessage(error, 'Không lưu được thay đổi'), 'error'),
  });
}
