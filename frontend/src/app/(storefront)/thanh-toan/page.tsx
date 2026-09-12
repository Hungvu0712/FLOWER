'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { Button } from '@/components/ui/Button';
import { HoneypotField } from '@/components/ui/HoneypotField';
import { CheckoutSteps } from '@/components/storefront/CheckoutSteps';
import { formatVnd } from '@/lib/currency';
import { useCartStore, useCartTotal } from '@/store/useCartStore';
import { useCreateOrder } from '@/features/domain/orders/orders.hooks';
import {
  ORDER_TIME_SLOT_LABELS,
  type OrderTimeSlot,
} from '@/features/domain/orders/orders.service';
import { useMe } from '@/features/core/account/account.hooks';
import { useAddresses } from '@/features/core/addresses/addresses.hooks';
import type { Address } from '@/features/core/addresses/addresses.service';
import { useValidateCoupon } from '@/features/domain/coupons/coupons.hooks';
import type { CouponValidateResult } from '@/features/domain/coupons/coupons.service';
import { getErrorMessage } from '@/lib/errors';

// Xem trước số tiền giảm ngay khi cart thay đổi (không gọi lại API mỗi lần) — mirror ĐÚNG cách tính ở
// backend coupons.service.ts#computeDiscount(). Chỉ là hiển thị tạm; backend LUÔN re-validate lại
// THẬT (kể cả minOrderValue, hết hạn, hết lượt) trong transaction tạo đơn — xem orders.service.ts.
function previewDiscount(coupon: CouponValidateResult, subtotal: number): number {
  if (coupon.type === 'percent') return Math.floor((subtotal * coupon.value) / 100);
  return Math.min(coupon.value, subtotal);
}

function formatAddressLine(address: Address): string {
  return [address.addressLine, address.ward, address.district, address.city]
    .filter(Boolean)
    .join(', ');
}

type FormState = {
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  deliveryDate: string;
  deliveryTimeSlot: OrderTimeSlot;
  note: string;
  website: string; // honeypot chống bot — xem <HoneypotField />
};

const emptyForm: FormState = {
  recipientName: '',
  recipientPhone: '',
  deliveryAddress: '',
  deliveryDate: '',
  deliveryTimeSlot: 'sang',
  note: '',
  website: '',
};

const TIME_SLOT_ORDER: OrderTimeSlot[] = ['sang', 'chieu', 'toi'];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 'use client' — cần đọc/xoá giỏ hàng (Zustand, chỉ tồn tại phía trình duyệt) và điều hướng sau khi
// đặt hàng thành công. Xem docs/modules/domain-orders.md.
export default function CheckoutPage() {
  const items = useCartStore((s) => s.items);
  const hasHydrated = useCartStore((s) => s.hasHydrated);
  const clear = useCartStore((s) => s.clear);
  const total = useCartTotal();
  const router = useRouter();
  const createOrder = useCreateOrder();
  const { data: me } = useMe();
  // Chỉ gọi khi ĐÃ XÁC NHẬN đăng nhập (me tồn tại) — trang thanh toán công khai, khách vãng lai
  // (chiếm đa số) không đăng nhập thì không cần gọi API sổ địa chỉ, tránh 401 thừa cho mọi lượt ghé.
  const { data: addresses } = useAddresses(!!me);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedAddressId, setSelectedAddressId] = useState('');

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidateResult | null>(null);
  const [couponError, setCouponError] = useState('');
  const validateCoupon = useValidateCoupon();
  const discountAmount = appliedCoupon ? previewDiscount(appliedCoupon, total) : 0;

  function handleApplyCoupon() {
    setCouponError('');
    validateCoupon.mutate(
      { code: couponCode, subtotal: total },
      {
        onSuccess: (result) => setAppliedCoupon(result),
        onError: (error) => {
          setAppliedCoupon(null);
          setCouponError(getErrorMessage(error, 'Mã giảm giá không hợp lệ'));
        },
      },
    );
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  }

  function applyAddress(id: string) {
    setSelectedAddressId(id);
    const address = addresses?.find((a) => a.id === id);
    if (!address) return;
    setForm((f) => ({
      ...f,
      recipientName: address.recipientName,
      recipientPhone: address.recipientPhone,
      deliveryAddress: formatAddressLine(address),
    }));
  }
  // Đặt hàng thành công thì `clear()` cũng làm items rỗng — nếu không đánh dấu lại, effect bên dưới
  // (phản ứng theo items.length) sẽ tưởng nhầm "giỏ trống do vào thẳng URL" và redirect NGƯỢC VỀ
  // /gio-hang, giành với điều hướng sang trang xác nhận đơn (router.push) — bug THẬT đã gặp khi test.
  const justOrderedRef = useRef(false);

  // Vào thẳng /thanh-toan khi giỏ trống (gõ URL tay, hoặc F5 sau khi đã đặt xong) — đưa về giỏ hàng
  // thay vì cho submit đơn rỗng. PHẢI đợi `hasHydrated` — `items` mặc định luôn là [] trước khi
  // Zustand đọc xong localStorage, chưa đợi thì mới thêm hàng xong vào thẳng trang này cũng bị đá
  // nhầm về /gio-hang (xem ghi chú ở useCartStore.ts).
  useEffect(() => {
    if (!justOrderedRef.current && hasHydrated && items.length === 0) router.replace('/gio-hang');
  }, [hasHydrated, items.length, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    createOrder.mutate(
      {
        items: items.map((i) => ({
          productId: i.productId,
          ...(i.variantId && { variantId: i.variantId }),
          quantity: i.quantity,
        })),
        recipientName: form.recipientName,
        recipientPhone: form.recipientPhone,
        deliveryAddress: form.deliveryAddress,
        deliveryDate: form.deliveryDate,
        deliveryTimeSlot: form.deliveryTimeSlot,
        note: form.note.trim() || undefined,
        ...(appliedCoupon && { couponCode: appliedCoupon.code }),
        website: form.website,
      },
      {
        onSuccess: (order) => {
          justOrderedRef.current = true;
          clear();
          router.push(`/don-hang/${order.id}`);
        },
        onError: (error) => {
          if (error instanceof AxiosError && error.response?.status === 422) {
            setFieldErrors(error.response.data.errors ?? {});
          }
        },
      },
    );
  }

  if (!hasHydrated || items.length === 0) return null; // đang đọc giỏ hàng, hoặc đang điều hướng về /gio-hang

  return (
    <div className="px-8 py-10 lg:px-16">
      <CheckoutSteps current="checkout" />
      <h1 className="mt-8 font-display text-3xl font-semibold text-ink">Thông tin giao hoa</h1>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-3">
        <form
          onSubmit={handleSubmit}
          className="relative flex flex-col gap-5 rounded-3xl border border-border-soft bg-white p-6 shadow-sm lg:col-span-2 lg:p-8"
        >
          <HoneypotField
            value={form.website}
            onChange={(website) => setForm((f) => ({ ...f, website }))}
          />

          {!!me && addresses && addresses.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">
                Chọn từ sổ địa chỉ (tuỳ chọn)
              </label>
              <select
                value={selectedAddressId}
                onChange={(e) => applyAddress(e.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-rose focus:ring-1 focus:ring-rose"
              >
                <option value="">— Nhập thông tin mới —</option>
                {addresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.recipientName} · {address.recipientPhone} —{' '}
                    {formatAddressLine(address)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">
                Tên người nhận
              </label>
              <input
                value={form.recipientName}
                onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-rose focus:ring-1 focus:ring-rose"
              />
              {fieldErrors.recipientName && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.recipientName}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">
                Số điện thoại
              </label>
              <input
                value={form.recipientPhone}
                onChange={(e) => setForm((f) => ({ ...f, recipientPhone: e.target.value }))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-rose focus:ring-1 focus:ring-rose"
              />
              {fieldErrors.recipientPhone && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.recipientPhone}</p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">
              Địa chỉ giao hoa
            </label>
            <input
              value={form.deliveryAddress}
              onChange={(e) => setForm((f) => ({ ...f, deliveryAddress: e.target.value }))}
              placeholder="Số nhà, đường, phường/xã, quận/huyện..."
              className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-muted/60 focus:border-rose focus:ring-1 focus:ring-rose"
            />
            {fieldErrors.deliveryAddress && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.deliveryAddress}</p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Ngày giao</label>
              <input
                type="date"
                min={todayIso()}
                value={form.deliveryDate}
                onChange={(e) => setForm((f) => ({ ...f, deliveryDate: e.target.value }))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-rose focus:ring-1 focus:ring-rose"
              />
              {fieldErrors.deliveryDate && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.deliveryDate}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">
                Khung giờ giao
              </label>
              <div className="flex gap-2">
                {TIME_SLOT_ORDER.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, deliveryTimeSlot: slot }))}
                    title={ORDER_TIME_SLOT_LABELS[slot]}
                    className={`flex-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors ${
                      form.deliveryTimeSlot === slot
                        ? 'border-rose bg-rose-light text-rose-dark'
                        : 'border-border text-ink-soft hover:border-rose'
                    }`}
                  >
                    {ORDER_TIME_SLOT_LABELS[slot].split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">
              Ghi chú (thiệp chúc, yêu cầu riêng...)
            </label>
            <textarea
              rows={3}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-rose focus:ring-1 focus:ring-rose"
            />
          </div>

          <div className="rounded-xl bg-ivory-50 p-4 text-xs text-ink-muted">
            Thanh toán khi nhận hàng (COD) — cửa hàng sẽ gọi điện xác nhận đơn trước khi giao.
          </div>

          {createOrder.isError && !Object.keys(fieldErrors).length && (
            <p className="text-xs text-red-600">
              {getErrorMessage(
                createOrder.error,
                'Đặt hàng không thành công, vui lòng thử lại sau ít phút.',
              )}
            </p>
          )}

          <Button
            type="submit"
            loading={createOrder.isPending}
            className="shadow-lg shadow-rose/25"
          >
            Đặt hàng
          </Button>
        </form>

        <div className="h-fit rounded-2xl border border-border-soft/70 bg-white p-6">
          <h2 className="text-sm font-semibold text-ink">Đơn hàng của bạn</h2>
          <div className="mt-4 flex flex-col gap-3">
            {items.map((item) => (
              <div
                key={`${item.productId}::${item.variantId ?? ''}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-ink-soft">
                  {item.name}
                  {item.variantName && ` (${item.variantName})`} × {item.quantity}
                </span>
                <span className="font-medium text-ink">
                  {formatVnd(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-border-soft pt-4">
            {appliedCoupon ? (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-rose-light px-3 py-2">
                <span className="text-xs font-medium text-rose-dark">
                  Đã áp dụng mã <span className="font-mono">{appliedCoupon.code}</span>
                </span>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-xs font-medium text-rose-dark underline"
                >
                  Gỡ mã
                </button>
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-muted">
                  Mã giảm giá (tuỳ chọn)
                </label>
                <div className="flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Nhập mã..."
                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-rose focus:ring-1 focus:ring-rose"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={validateCoupon.isPending}
                    disabled={!couponCode.trim()}
                    onClick={handleApplyCoupon}
                  >
                    Áp dụng
                  </Button>
                </div>
                {couponError && <p className="mt-1 text-xs text-red-600">{couponError}</p>}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-1.5 border-t border-border-soft pt-4 text-sm">
            <div className="flex items-center justify-between text-ink-soft">
              <span>Tạm tính</span>
              <span>{formatVnd(total)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-ink-soft">
                <span>Giảm giá</span>
                <span>-{formatVnd(discountAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="text-ink">Tổng cộng</span>
              <span className="text-rose">{formatVnd(total - discountAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
