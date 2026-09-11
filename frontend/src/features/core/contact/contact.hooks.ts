'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contactService } from './contact.service';
import { useToastStore } from '@/store/useToastStore';
import { getErrorMessage } from '@/lib/errors';

// Không toast lỗi/thành công chung chung ở đây — form Liên hệ tự hiện thông báo riêng trong trang
// (kèm lỗi validate theo từng field), khác các mutation admin CRUD khác trong dự án.
export function useSubmitContact() {
  return useMutation({ mutationFn: contactService.submit });
}

export function useContactMessages(params?: {
  isHandled?: boolean;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['admin', 'contact-messages', params ?? null],
    queryFn: () => contactService.list(params),
  });
}

export function useSetContactHandled() {
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ id, isHandled }: { id: string; isHandled: boolean }) =>
      contactService.setHandled(id, isHandled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'contact-messages'] }),
    onError: (error) => push(getErrorMessage(error, 'Không cập nhật được'), 'error'),
  });
}
