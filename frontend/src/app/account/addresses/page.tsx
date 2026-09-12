'use client';

import { useState } from 'react';
import {
  useAddresses,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
} from '@/features/core/addresses/addresses.hooks';
import type { Address } from '@/features/core/addresses/addresses.service';
import { Button } from '@/components/ui/Button';
import { confirmDialog } from '@/store/useConfirmStore';

type FormState = {
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  ward: string;
  district: string;
  city: string;
};

const emptyForm: FormState = {
  recipientName: '',
  recipientPhone: '',
  addressLine: '',
  ward: '',
  district: '',
  city: '',
};

function toInput(form: FormState) {
  return {
    recipientName: form.recipientName,
    recipientPhone: form.recipientPhone,
    addressLine: form.addressLine,
    ward: form.ward || undefined,
    district: form.district || undefined,
    city: form.city || undefined,
  };
}

function AddressForm({
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
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Tên người nhận</label>
          <input
            value={form.recipientName}
            onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Số điện thoại</label>
          <input
            value={form.recipientPhone}
            onChange={(e) => setForm((f) => ({ ...f, recipientPhone: e.target.value }))}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-ink-muted">Địa chỉ</label>
        <input
          value={form.addressLine}
          onChange={(e) => setForm((f) => ({ ...f, addressLine: e.target.value }))}
          placeholder="Số nhà, đường..."
          className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none placeholder:text-ink-muted/60 focus:border-rose focus:ring-1 focus:ring-rose"
        />
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">
            Phường/Xã (tuỳ chọn)
          </label>
          <input
            value={form.ward}
            onChange={(e) => setForm((f) => ({ ...f, ward: e.target.value }))}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">
            Quận/Huyện (tuỳ chọn)
          </label>
          <input
            value={form.district}
            onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">
            Tỉnh/Thành phố (tuỳ chọn)
          </label>
          <input
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
          />
        </div>
      </div>
    </>
  );
}

// Sổ địa chỉ người nhận — dữ liệu cá nhân, backend chỉ yêu cầu đăng nhập (không permission riêng),
// xem docs/modules/domain-addresses.md. Địa chỉ ĐẦU TIÊN tự động là mặc định (xử lý ở backend), nên
// form tạo ở đây KHÔNG có ô chọn "đặt làm mặc định" — chỉ có nút "Đặt làm mặc định" riêng trên từng
// địa chỉ đã lưu, đơn giản hơn cho người dùng.
export default function AddressesPage() {
  const { data: addresses, isLoading } = useAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);

  const addressList = addresses ?? [];

  function startEdit(address: Address) {
    setEditingId(address.id);
    setEditForm({
      recipientName: address.recipientName,
      recipientPhone: address.recipientPhone,
      addressLine: address.addressLine,
      ward: address.ward ?? '',
      district: address.district ?? '',
      city: address.city ?? '',
    });
  }

  function submitCreate() {
    createAddress.mutate(toInput(createForm), {
      onSuccess: () => {
        setCreating(false);
        setCreateForm(emptyForm);
      },
    });
  }

  function submitEdit(id: string) {
    updateAddress.mutate({ id, input: toInput(editForm) }, { onSuccess: () => setEditingId(null) });
  }

  return (
    <div className="rounded-3xl border border-border-soft bg-white p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Sổ địa chỉ</h1>
        <Button variant={creating ? 'outline' : 'primary'} onClick={() => setCreating((v) => !v)}>
          {creating ? 'Đóng' : 'Thêm địa chỉ mới'}
        </Button>
      </div>

      {creating && (
        <div className="mb-6 rounded-2xl border border-border-soft p-6">
          <AddressForm form={createForm} setForm={setCreateForm} />
          <Button
            size="sm"
            loading={createAddress.isPending}
            disabled={
              !createForm.recipientName || !createForm.recipientPhone || !createForm.addressLine
            }
            onClick={submitCreate}
          >
            Lưu địa chỉ
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-ink-muted">Đang tải...</p>
      ) : addressList.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Chưa có địa chỉ nào — thêm địa chỉ để đặt hàng nhanh hơn.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {addressList.map((address) => (
            <li key={address.id} className="rounded-2xl border border-border-soft p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink">
                      {address.recipientName} · {address.recipientPhone}
                    </p>
                    {address.isDefault && (
                      <span className="rounded-full bg-rose px-2 py-0.5 text-xs font-medium text-white">
                        Mặc định
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    {[address.addressLine, address.ward, address.district, address.city]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!address.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={updateAddress.isPending}
                      onClick={() =>
                        updateAddress.mutate({ id: address.id, input: { isDefault: true } })
                      }
                    >
                      Đặt làm mặc định
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      editingId === address.id ? setEditingId(null) : startEdit(address)
                    }
                  >
                    {editingId === address.id ? 'Đóng' : 'Sửa'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      const confirmed = await confirmDialog(
                        `Xoá địa chỉ của "${address.recipientName}"?`,
                        { title: 'Xoá địa chỉ', danger: true },
                      );
                      if (confirmed) deleteAddress.mutate(address.id);
                    }}
                  >
                    Xoá
                  </Button>
                </div>
              </div>

              {editingId === address.id && (
                <div className="mt-5 border-t border-border-soft pt-5">
                  <AddressForm form={editForm} setForm={setEditForm} />
                  <Button
                    size="sm"
                    loading={updateAddress.isPending}
                    onClick={() => submitEdit(address.id)}
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
