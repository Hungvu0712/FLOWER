'use client';

import { useAdminLoginMethods, useUpdateLoginMethod } from '@/features/core/admin-login-methods/loginMethods.hooks';

const LABELS: Record<string, string> = {
  google_oauth: 'Đăng nhập với Google',
  email_password: 'Đăng nhập bằng email/mật khẩu',
  magic_link: 'Đăng nhập bằng magic link',
};

// Luôn phải còn >= 1 phương thức bật — backend chặn cứng (SECURITY.md §1), ở đây chỉ disable nút +
// hiện cảnh báo sớm cho UX tốt hơn (yêu cầu #7).
export default function LoginMethodsPage() {
  const { data: methods, isLoading } = useAdminLoginMethods();
  const update = useUpdateLoginMethod();

  if (isLoading || !methods) return <p className="text-sm text-neutral-500">Đang tải...</p>;

  const enabledCount = methods.filter((m) => m.isEnabled).length;

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-neutral-900">Phương thức đăng nhập</h1>

      <ul className="flex flex-col gap-2">
        {methods.map((m) => {
          const isLastEnabled = m.isEnabled && enabledCount === 1;
          return (
            <li
              key={m.method}
              className="flex items-center justify-between rounded-md border border-neutral-200 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">{LABELS[m.method]}</p>
                {isLastEnabled && (
                  <p className="text-xs text-amber-600">
                    Đây là phương thức duy nhất đang bật — không thể tắt (luôn cần tối thiểu 1 phương thức).
                  </p>
                )}
              </div>
              <button
                role="switch"
                aria-checked={m.isEnabled}
                disabled={isLastEnabled || update.isPending}
                onClick={() => update.mutate({ method: m.method, isEnabled: !m.isEnabled })}
                className={`h-6 w-11 rounded-full transition-colors disabled:opacity-40 ${
                  m.isEnabled ? 'bg-neutral-900' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform ${
                    m.isEnabled ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
