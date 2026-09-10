'use client';

import { useAdminLoginMethods, useUpdateLoginMethod } from '@/features/core/admin-login-methods/loginMethods.hooks';
import { PageHeader } from '@/components/admin/PageHeader';
import { Switch } from '@/components/ui/Switch';

const METHOD_INFO: Record<string, { label: string; description: string }> = {
  google_oauth: { label: 'Đăng nhập với Google', description: 'Cho phép đăng nhập bằng tài khoản Google.' },
  email_password: { label: 'Email / Mật khẩu', description: 'Phương thức đăng nhập truyền thống bằng email và mật khẩu.' },
  magic_link: { label: 'Magic link', description: 'Gửi liên kết đăng nhập một lần qua email, không cần mật khẩu.' },
};

// Luôn phải còn >= 1 phương thức bật — backend chặn cứng (docs/07 §1), ở đây chỉ disable nút +
// hiện cảnh báo sớm cho UX tốt hơn.
export default function LoginMethodsPage() {
  const { data: methods, isLoading } = useAdminLoginMethods();
  const update = useUpdateLoginMethod();

  return (
    <div>
      <PageHeader title="Phương thức đăng nhập" description="Bật/tắt các phương thức xác thực cho toàn hệ thống." />

      {isLoading || !methods ? (
        <p className="text-sm text-ink-muted">Đang tải...</p>
      ) : (
        <div className="flex flex-col gap-3">
          {methods.map((m) => {
            const enabledCount = methods.filter((x) => x.isEnabled).length;
            const isLastEnabled = m.isEnabled && enabledCount === 1;
            const info = METHOD_INFO[m.method];
            return (
              <div
                key={m.method}
                className="flex items-center justify-between gap-4 rounded-3xl border border-border-soft bg-white p-6"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{info?.label ?? m.method}</p>
                  <p className="mt-1 text-xs text-ink-muted">{info?.description}</p>
                  {isLastEnabled && (
                    <p className="mt-2 text-xs text-amber-600">
                      Đây là phương thức duy nhất đang bật — không thể tắt (luôn cần tối thiểu 1 phương thức).
                    </p>
                  )}
                </div>
                <Switch
                  checked={m.isEnabled}
                  disabled={isLastEnabled || update.isPending}
                  onChange={() => update.mutate({ method: m.method, isEnabled: !m.isEnabled })}
                  label={info?.label ?? m.method}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
