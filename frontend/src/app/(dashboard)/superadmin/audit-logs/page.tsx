'use client';

import { Fragment, useState } from 'react';
import { useAuditLogs } from '@/features/core/audit-log/auditLog.hooks';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/Button';
import { IconHistory } from '@/components/admin/icons';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN');
}

// entityType là chuỗi tự do (không phải enum cố định — module mới tự đặt entityType riêng, xem
// docs/modules/core-audit-log.md), nên lọc bằng ô nhập tay thay vì dropdown liệt kê sẵn — 1 danh sách
// cứng ở đây chắc chắn lệch dần so với thực tế khi có module mới ghi audit log.
export default function AuditLogsPage() {
  const [entityType, setEntityType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useAuditLogs({
    entityType: entityType || undefined,
    // Cuối ngày (23:59:59.999) để include đủ cả ngày `to` — chỉ '00:00:00.000Z' sẽ bỏ sót mọi bản ghi
    // ghi trong chính ngày đó.
    from: fromDate ? `${fromDate}T00:00:00.000Z` : undefined,
    to: toDate ? `${toDate}T23:59:59.999Z` : undefined,
    page,
  });

  function resetFilters() {
    setEntityType('');
    setFromDate('');
    setToDate('');
    setPage(1);
  }

  return (
    <div>
      <PageHeader
        title="Nhật ký Audit"
        description="Lịch sử thao tác nhạy cảm trong hệ thống — ai làm gì, khi nào, từ IP nào."
      />

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-3xl border border-border-soft bg-white p-6">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">
            Loại đối tượng
          </label>
          <input
            placeholder="vd: user, order, folder..."
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            className="w-48 rounded-xl border border-border px-3.5 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Từ ngày</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border px-3.5 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Đến ngày</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border px-3.5 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
          />
        </div>
        {(entityType || fromDate || toDate) && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Xoá bộ lọc
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-ink-muted">Đang tải...</p>
      ) : !data?.items.length ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
          <IconHistory className="h-8 w-8 text-ink-muted" />
          <p className="text-sm text-ink-muted">Không có bản ghi nào khớp bộ lọc.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border-soft bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-soft text-left text-ink-muted">
                <th className="px-6 py-3 font-medium">Thời gian</th>
                <th className="px-6 py-3 font-medium">Người thực hiện</th>
                <th className="px-6 py-3 font-medium">Hành động</th>
                <th className="px-6 py-3 font-medium">Đối tượng</th>
                <th className="px-6 py-3 font-medium">IP</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((log) => {
                const hasDetail = log.before !== null || log.after !== null;
                const isExpanded = expandedId === log.id;
                return (
                  <Fragment key={log.id}>
                    <tr className="border-b border-border-soft/70">
                      <td className="px-6 py-3 whitespace-nowrap text-ink-soft">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-6 py-3">
                        {log.actor ? (
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink">{log.actor.fullName}</p>
                            <p className="truncate text-xs text-ink-muted">{log.actor.email}</p>
                          </div>
                        ) : (
                          <span className="text-ink-muted italic">Hệ thống</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <code className="rounded-md bg-ivory-50 px-2 py-1 text-xs text-ink-soft">
                          {log.action}
                        </code>
                      </td>
                      <td className="px-6 py-3 text-ink-soft">
                        {log.entityType}
                        <span
                          className="ml-1 text-xs text-ink-muted"
                          title={log.entityId}
                        >
                          #{log.entityId.slice(0, 8)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-ink-muted">{log.ipAddress ?? '—'}</td>
                      <td className="px-6 py-3 text-right">
                        {hasDetail && (
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            className="text-xs font-semibold text-rose hover:text-rose-dark"
                          >
                            {isExpanded ? 'Ẩn' : 'Chi tiết'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-border-soft/70">
                        <td colSpan={6} className="bg-ivory-50 px-6 py-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {log.before !== null && log.before !== undefined && (
                              <div>
                                <p className="mb-1.5 text-xs font-semibold text-ink-muted">
                                  Trước
                                </p>
                                <pre className="overflow-x-auto rounded-xl bg-white p-3 text-xs text-ink-soft">
                                  {JSON.stringify(log.before, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.after !== null && log.after !== undefined && (
                              <div>
                                <p className="mb-1.5 text-xs font-semibold text-ink-muted">Sau</p>
                                <pre className="overflow-x-auto rounded-xl bg-white p-3 text-xs text-ink-soft">
                                  {JSON.stringify(log.after, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          {data.meta.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <p className="text-xs text-ink-muted">
                Trang {data.meta.page}/{data.meta.totalPages} · {data.meta.total} bản ghi
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
