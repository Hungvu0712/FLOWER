'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { systemSettingsService, type SettingKey } from './systemSettings.service';
import { useToastStore } from '@/store/useToastStore';
import { getErrorMessage } from '@/lib/errors';

export function useSystemSettings() {
  return useQuery({ queryKey: ['admin', 'settings'], queryFn: systemSettingsService.list });
}

export function useUpdateSystemSetting() {
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ key, value }: { key: SettingKey; value: unknown }) =>
      systemSettingsService.update(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      push('Đã lưu thay đổi');
    },
    onError: (error) => push(getErrorMessage(error, 'Không lưu được thay đổi'), 'error'),
  });
}
