'use client';

import { useState } from 'react';
import {
  useCoupons,
  useCreateCoupon,
  useUpdateCoupon,
  useDeleteCoupon,
} from '@/features/domain/coupons/coupons.hooks';
import type { Coupon, CouponType } from '@/features/domain/coupons/coupons.service';
import { formatVnd } from '@/lib/currency';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { confirmDialog } from '@/store/useConfirmStore';

type FormState = {
  code: string;
  type: CouponType;
  value: string;
  minOrderValue: string;
  startDate: string; // 'YYYY-MM-DD', rỗng = không giới hạn
  endDate: string;
  usageLimit: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  code: '',
  type: 'percent',
  value: '',
  minOrderValue: '',
  startDate: '',
  endDate: '',
  usageLimit: '',
  isActive: true,
};

function toInput(form: FormState) {
  return {
    code: form.code,
    type: form.type,
    value: Number(form.value) || 0,
    ...(form.minOrderValue && { minOrderValue: Number(form.minOrderValue) }),
    // Neo giờ UTC đầu/cuối ngày — khớp cách backend xử lý cột @db.Date ở orders.service.ts (LUÔN dùng
    // '...Z', tránh lệch ngày do múi giờ Asia/Saigon UTC+7).
    ...(form.startDate && { startDate: `${form.startDate}T00:00:00.000Z` }),
    ...(form.endDate && { endDate: `${form.endDate}T23:59:59.999Z` }),
    ...(form.usageLimit && { usageLimit: Number(form.usageLimit) }),
    isActive: form.isActive,
  };
}

function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

// Mã giảm giá (coupon) — permission `promotions.manage` (chỉ admin/super_admin, xem
// docs/05-database-va-rbac.md §2.4). Xoá THẬT (không soft-delete) nhưng backend chặn xoá khi mã ĐÃ
// TỪNG được dùng (usedCount > 0, trả 409 COUPON_IN_USE) — dùng "Tạm ngưng" (isActive: false) thay vì
// xoá cho mã đã có lịch sử dùng. Xem docs/modules/domain-coupons.md.
export default function CouponsPage() {
  const { data, isLoading } = useCoupons({ includeInactive: true, limit: 100 });
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);

  const coupons = data?.data ?? [];

  function startEdit(coupon: Coupon) {
    setEditingId(coupon.id);
    setEditForm({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value),
      minOrderValue: coupon.minOrderValue !== null ? String(coupon.minOrderValue) : '',
      startDate: toDateInputValue(coupon.startDate),
      endDate: toDateInputValue(coupon.endDate),
      usageLimit: coupon.usageLimit !== null ? String(coupon.usageLimit) : '',
      isActive: coupon.isActive,
    });
  }

  function submitCreate() {
    createCoupon.mutate(toInput(createForm), {
      onSuccess: () => {
        setCreating(false);
        setCreateForm(emptyForm);
      },
    });
  }

  function submitEdit(id: string) {
    updateCoupon.mutate({ id, input: toInput(editForm) }, { onSuccess: () => setEditingId(null) });
  }

  return (
    <div>
      <PageHeader
        title="Mã giảm giá"
        description="Quản lý mã giảm giá áp dụng ở trang thanh toán — mỗi đơn dùng được tối đa 1 mã."
        actions={
          <Button
            size="sm"
            variant={creating ? 'outline' : 'primary'}
            onClick={() => setCreating((v) => !v)}
          >
            {creating ? 'Đóng' : 'Tạo mã mới'}
          </Button>
        }
      />

      {creating && (
        <div className="mb-6 rounded-3xl border border-border-soft bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-ink">Mã giảm giá mới</h2>
          <CouponForm form={createForm} setForm={setCreateForm} />
          <Button
            size="sm"
            loading={createCoupon.isPending}
            disabled={!createForm.code || !createForm.value}
            onClick={submitCreate}
          >
            Tạo mã
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-ink-muted">Đang tải...</p>
      ) : coupons.length === 0 ? (
        <p className="text-sm text-ink-muted">Chưa có mã giảm giá nào.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="rounded-3xl border border-border-soft bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-semibold text-ink">{coupon.code}</p>
                    <StatusBadge tone={coupon.isActive ? 'success' : 'neutral'}>
                      {coupon.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                    </StatusBadge>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {coupon.type === 'percent'
                      ? `Giảm ${coupon.value}%`
                      : `Giảm ${formatVnd(coupon.value)}`}
                    {coupon.minOrderValue !== null &&
                      ` · Đơn tối thiểu ${formatVnd(coupon.minOrderValue)}`}
                    {' · Đã dùng '}
                    {coupon.usedCount}
                    {coupon.usageLimit !== null
                      ? `/${coupon.usageLimit} lượt`
                      : ' lượt (không giới hạn)'}
                  </p>
                  {(coupon.startDate || coupon.endDate) && (
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Hiệu lực:{' '}
                      {coupon.startDate
                        ? new Date(coupon.startDate).toLocaleDateString('vi-VN')
                        : '—'}
                      {' → '}
                      {coupon.endDate
                        ? new Date(coupon.endDate).toLocaleDateString('vi-VN')
                        : 'không hết hạn'}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      editingId === coupon.id ? setEditingId(null) : startEdit(coupon)
                    }
                  >
                    {editingId === coupon.id ? 'Đóng' : 'Sửa'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      const confirmed = await confirmDialog(
                        coupon.usedCount > 0
                          ? `Mã "${coupon.code}" đã được dùng ${coupon.usedCount} lần — không thể xoá, chỉ có thể tạm ngưng. Vẫn thử xoá?`
                          : `Xoá mã giảm giá "${coupon.code}"?`,
                        { title: 'Xoá mã giảm giá', danger: true },
                      );
                      if (confirmed) deleteCoupon.mutate(coupon.id);
                    }}
                  >
                    Xoá
                  </Button>
                </div>
              </div>

              {editingId === coupon.id && (
                <div className="mt-5 border-t border-border-soft pt-5">
                  <CouponForm form={editForm} setForm={setEditForm} />
                  <Button
                    size="sm"
                    loading={updateCoupon.isPending}
                    onClick={() => submitEdit(coupon.id)}
                  >
                    Lưu thay đổi
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CouponForm({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  return (
    <>
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Mã</label>
          <input
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            placeholder="VD: SALE10"
            className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Loại giảm giá</label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CouponType }))}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
          >
            <option value="percent">Theo % đơn hàng</option>
            <option value="fixed">Số tiền cố định (VNĐ)</option>
          </select>
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">
            {form.type === 'percent' ? 'Giá trị (%, tối đa 100)' : 'Giá trị (VNĐ)'}
          </label>
          <input
            type="number"
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">
            Đơn tối thiểu (tuỳ chọn)
          </label>
          <input
            type="number"
            value={form.minOrderValue}
            onChange={(e) => setForm((f) => ({ ...f, minOrderValue: e.target.value }))}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
          />
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">
            Ngày bắt đầu (tuỳ chọn)
          </label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">
            Ngày hết hạn (tuỳ chọn)
          </label>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">
            Giới hạn lượt dùng (tuỳ chọn)
          </label>
          <input
            type="number"
            value={form.usageLimit}
            onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
          />
        </div>
      </div>

      <div className="mb-5 flex items-center justify-between rounded-2xl border border-border-soft px-4 py-3">
        <div>
          <p className="text-sm font-medium text-ink">Đang hoạt động</p>
          <p className="text-xs text-ink-muted">Tắt để tạm ngưng mã mà không cần xoá.</p>
        </div>
        <Switch
          checked={form.isActive}
          onChange={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
          label="Đang hoạt động"
        />
      </div>
    </>
  );
}
