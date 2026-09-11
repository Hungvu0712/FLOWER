'use client';

import {
  useSessions,
  useRevokeSession,
  useRevokeOtherSessions,
} from '@/features/core/account/account.hooks';
import { Button } from '@/components/ui/Button';

export default function DevicesPage() {
  const { data: sessions, isLoading } = useSessions();
  const revokeSession = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();

  if (isLoading) return <p className="text-sm text-ink-muted">Đang tải...</p>;

  return (
    <div className="rounded-3xl border border-border-soft bg-white p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Thiết bị đăng nhập</h1>
        <Button
          variant="outline"
          onClick={() => revokeOthers.mutate()}
          loading={revokeOthers.isPending}
        >
          Đăng xuất tất cả thiết bị khác
        </Button>
      </div>

      <ul className="flex flex-col gap-3">
        {sessions?.map((session) => (
          <li
            key={session.id}
            className="flex items-center justify-between rounded-2xl border border-border-soft px-5 py-4"
          >
            <div>
              <p className="text-sm font-medium text-ink">
                {session.deviceName || 'Thiết bị không xác định'}
                {session.isCurrent && (
                  <span className="ml-2 rounded-full bg-rose px-2 py-0.5 text-xs text-white">
                    Hiện tại
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                IP {session.ipAddress} · Hoạt động lần cuối{' '}
                {new Date(session.lastActiveAt).toLocaleString('vi-VN')}
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
