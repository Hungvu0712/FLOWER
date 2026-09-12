'use client';

import {
  useNewsletterSubscribers,
  useDeleteNewsletterSubscriber,
} from '@/features/domain/newsletter/newsletter.hooks';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { confirmDialog } from '@/store/useConfirmStore';

// Danh sách người đăng ký nhận tin — permission `blog.manage` (dùng LẠI, cùng nhóm "Nội dung" với
// Blog — xem docs/05-database-va-rbac.md §2.4). Đây là giai đoạn "thu thập email", CHƯA có soạn/gửi
// newsletter hàng loạt — xem docs/modules/domain-blog.md §7.
export default function NewsletterPage() {
  const { data, isLoading } = useNewsletterSubscribers({ limit: 100 });
  const deleteSubscriber = useDeleteNewsletterSubscriber();

  const subscribers = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Newsletter"
        description="Danh sách người đăng ký nhận email khuyến mãi/tin mới từ form ở footer."
      />

      {isLoading ? (
        <p className="text-sm text-ink-muted">Đang tải...</p>
      ) : subscribers.length === 0 ? (
        <p className="text-sm text-ink-muted">Chưa có người đăng ký nào.</p>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border-soft bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-soft text-left text-ink-muted">
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Trạng thái</th>
                <th className="px-6 py-3 font-medium">Ngày đăng ký</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s.id} className="border-b border-border-soft/70">
                  <td className="px-6 py-3 text-ink">{s.email}</td>
                  <td className="px-6 py-3">
                    <StatusBadge tone={s.isActive ? 'success' : 'neutral'}>
                      {s.isActive ? 'Đang nhận tin' : 'Đã hủy'}
                    </StatusBadge>
                  </td>
                  <td className="px-6 py-3 text-ink-muted">
                    {new Date(s.subscribedAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={async () => {
                        const confirmed = await confirmDialog(
                          `Xoá hẳn "${s.email}" khỏi danh sách?`,
                          { title: 'Xoá người đăng ký', danger: true },
                        );
                        if (confirmed) deleteSubscriber.mutate(s.id);
                      }}
                    >
                      Xoá
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
