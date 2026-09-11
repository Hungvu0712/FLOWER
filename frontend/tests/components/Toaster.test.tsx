import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { Toaster } from '@/components/ui/Toaster';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToastStore } from '@/store/useToastStore';
import { confirmDialog, useConfirmStore } from '@/store/useConfirmStore';

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
  useConfirmStore.setState({
    open: false,
    message: '',
    title: 'Xác nhận',
    danger: false,
    resolve: null,
  });
});

describe('Toaster', () => {
  it('không render gì khi chưa có toast nào', () => {
    const { container } = render(<Toaster />);
    expect(container).toBeEmptyDOMElement();
  });

  it('hiện toast được push từ bất kỳ đâu trong app', () => {
    render(<Toaster />);
    act(() => useToastStore.getState().push('Đã lưu thay đổi'));
    expect(screen.getByText('Đã lưu thay đổi')).toBeInTheDocument();
  });

  it('bấm vào toast để đóng ngay', async () => {
    render(<Toaster />);
    act(() => useToastStore.getState().push('Đã lưu'));
    await userEvent.click(screen.getByText('Đã lưu'));
    expect(screen.queryByText('Đã lưu')).not.toBeInTheDocument();
  });

  it('hiện nhiều toast cùng lúc', () => {
    render(<Toaster />);
    act(() => {
      useToastStore.getState().push('Thứ nhất');
      useToastStore.getState().push('Thứ hai', 'error');
    });
    expect(screen.getByText('Thứ nhất')).toBeInTheDocument();
    expect(screen.getByText('Thứ hai')).toBeInTheDocument();
  });
});

describe('ConfirmDialog — thay cho window.confirm', () => {
  it('ẩn khi chưa được gọi', () => {
    const { container } = render(<ConfirmDialog />);
    expect(container).toBeEmptyDOMElement();
  });

  it('confirmDialog() mở hộp thoại và resolve TRUE khi người dùng đồng ý', async () => {
    render(<ConfirmDialog />);
    let result: boolean | undefined;
    act(() => {
      void confirmDialog('Xoá danh mục này?').then((r) => (result = r));
    });

    expect(await screen.findByText('Xoá danh mục này?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /xác nhận|đồng ý|xoá/i }));
    expect(result).toBe(true);
  });

  it('resolve FALSE khi người dùng huỷ — thao tác phá huỷ không được thực hiện', async () => {
    render(<ConfirmDialog />);
    let result: boolean | undefined;
    act(() => {
      void confirmDialog('Xoá tài khoản?').then((r) => (result = r));
    });
    await screen.findByText('Xoá tài khoản?');
    await userEvent.click(screen.getByRole('button', { name: /huỷ|hủy|thoát/i }));
    expect(result).toBe(false);
  });
});
