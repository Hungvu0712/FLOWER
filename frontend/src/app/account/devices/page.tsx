'use client';

import { useSessions, useRevokeSession, useRevokeOtherSessions } from '@/features/core/account/account.hooks';
import { Button } from '@/components/ui/Button';

export default function DevicesPage() {
  const { data: sessions, isLoading } = useSessions();
  const revokeSession = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();

  if (isLoading) return <p className="text-sm text-neutral-500">Đang tải...</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Thiết bị đăng nhập</h1>
        <Button variant="ghost" onClick={() => revokeOthers.mutate()} loading={revokeOthers.isPending}>
          Đăng xuất tất cả thiết bị khác
        </Button>
      </div>

      <ul className="flex flex-col gap-2">
        {sessions?.map((session) => (
          <li
            key={session.id}
            className="flex items-center justify-between rounded-md border border-neutral-200 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-neutral-900">
                {session.deviceName || 'Thiết bị không xác định'}
                {session.isCurrent && (
                  <span className="ml-2 rounded bg-neutral-900 px-1.5 py-0.5 text-xs text-white">Hiện tại</span>
                )}
              </p>
              <p className="text-xs text-neutral-500">
                IP {session.ipAddress} · Hoạt động lần cuối {new Date(session.lastActiveAt).toLocaleString('vi-VN')}
              </p>
            </div>
            {!session.isCurrent && (
              <Button
                variant="danger"
                onClick={() => revokeSession.mutate(session.id)}
                loading={revokeSession.isPending}
              >
                Đăng xuất
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
