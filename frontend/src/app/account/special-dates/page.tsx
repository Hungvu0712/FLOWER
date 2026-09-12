'use client';

import { useState } from 'react';
import {
  useSpecialDates,
  useCreateSpecialDate,
  useUpdateSpecialDate,
  useDeleteSpecialDate,
} from '@/features/domain/specialDates/specialDates.hooks';
import type { SpecialDate } from '@/features/domain/specialDates/specialDates.service';
import { Button } from '@/components/ui/Button';
import { confirmDialog } from '@/store/useConfirmStore';

type FormState = {
  label: string;
  date: string; // 'YYYY-MM-DD'
  remindDaysBefore: string;
};

const emptyForm: FormState = { label: '', date: '', remindDaysBefore: '3' };

function toInput(form: FormState) {
  return {
    label: form.label,
    date: form.date,
    remindDaysBefore: form.remindDaysBefore ? Number(form.remindDaysBefore) : undefined,
  };
}

// Chỉ THÁNG-NGÀY của `date` được dùng để nhắc lại hằng năm — năm nhập vào ô ngày không quan trọng,
// hiển thị lại ngày/tháng thôi cho gọn (không hiện năm, tránh gây hiểu nhầm "chỉ nhắc đúng năm đó").
// Tự ghép chuỗi (không dùng Intl.DateTimeFormat) — dấu phân cách "/" của locale vi-VN không ổn định
// giữa các môi trường ICU khác nhau (Node vs trình duyệt từng render lệch "-" thay vì "/" khi kiểm
// chứng bằng Playwright), tự ghép để LUÔN ra đúng "dd/mm" mọi nơi. Đọc theo UTC — giống cách lưu ở
// specialDates.service.ts (@db.Date, luôn neo UTC midnight).
function formatMonthDay(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function SpecialDateForm({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  return (
    <div className="mb-4 grid gap-4 sm:grid-cols-3">
      <div className="sm:col-span-1">
        <label className="mb-1.5 block text-xs font-medium text-ink-muted">
          Tên dịp (vd: Sinh nhật mẹ)
        </label>
        <input
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-ink-muted">
          Ngày (chỉ ngày/tháng được dùng, lặp lại hằng năm)
        </label>
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-ink-muted">
          Nhắc trước (số ngày)
        </label>
        <input
          type="number"
          min={0}
          max={30}
          value={form.remindDaysBefore}
          onChange={(e) => setForm((f) => ({ ...f, remindDaysBefore: e.target.value }))}
          className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
        />
      </div>
    </div>
  );
}

// Nhắc lịch sinh nhật/kỷ niệm — dữ liệu cá nhân, backend chỉ yêu cầu đăng nhập (không permission
// riêng), xem docs/modules/domain-special-dates.md. Job nền hằng ngày gửi email nhắc trước đúng số
// ngày đã chọn — chưa có kênh nhắc nào khác (SMS/thông báo trong app).
export default function SpecialDatesPage() {
  const { data: dates, isLoading } = useSpecialDates();
  const createDate = useCreateSpecialDate();
  const updateDate = useUpdateSpecialDate();
  const deleteDate = useDeleteSpecialDate();

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);

  const dateList = dates ?? [];

  function startEdit(item: SpecialDate) {
    setEditingId(item.id);
    setEditForm({
      label: item.label,
      date: item.date.slice(0, 10),
      remindDaysBefore: String(item.remindDaysBefore),
    });
  }

  function submitCreate() {
    createDate.mutate(toInput(createForm), {
      onSuccess: () => {
        setCreating(false);
        setCreateForm(emptyForm);
      },
    });
  }

  function submitEdit(id: string) {
    updateDate.mutate({ id, input: toInput(editForm) }, { onSuccess: () => setEditingId(null) });
  }

  return (
    <div className="rounded-3xl border border-border-soft bg-white p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">
          Nhắc lịch sinh nhật/kỷ niệm
        </h1>
        <Button variant={creating ? 'outline' : 'primary'} onClick={() => setCreating((v) => !v)}>
          {creating ? 'Đóng' : 'Thêm ngày mới'}
        </Button>
      </div>
      <p className="mb-6 -mt-3 text-sm text-ink-muted">
        Lưu ngày sinh nhật, kỷ niệm... chúng tôi sẽ gửi email nhắc bạn trước để kịp chuẩn bị hoa.
      </p>

      {creating && (
        <div className="mb-6 rounded-2xl border border-border-soft p-6">
          <SpecialDateForm form={createForm} setForm={setCreateForm} />
          <Button
            size="sm"
            loading={createDate.isPending}
            disabled={!createForm.label || !createForm.date}
            onClick={submitCreate}
          >
            Lưu
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-ink-muted">Đang tải...</p>
      ) : dateList.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Chưa có ngày đặc biệt nào — thêm để không bỏ lỡ dịp quan trọng.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {dateList.map((item) => (
            <li key={item.id} className="rounded-2xl border border-border-soft p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{item.label}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {formatMonthDay(item.date)} · Nhắc trước {item.remindDaysBefore} ngày
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => (editingId === item.id ? setEditingId(null) : startEdit(item))}
                  >
                    {editingId === item.id ? 'Đóng' : 'Sửa'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      const confirmed = await confirmDialog(`Xoá "${item.label}"?`, {
                        title: 'Xoá ngày đặc biệt',
                        danger: true,
                      });
                      if (confirmed) deleteDate.mutate(item.id);
                    }}
                  >
                    Xoá
                  </Button>
                </div>
              </div>

              {editingId === item.id && (
                <div className="mt-5 border-t border-border-soft pt-5">
                  <SpecialDateForm form={editForm} setForm={setEditForm} />
                  <Button
                    size="sm"
                    loading={updateDate.isPending}
                    onClick={() => submitEdit(item.id)}
                  >
                    Lưu thay đổi
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
