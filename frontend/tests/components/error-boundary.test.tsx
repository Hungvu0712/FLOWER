import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RouteError from '@/app/error';
import GlobalError from '@/app/global-error';

// docs/12 FE-01: trước đây KHÔNG có error boundary nào — lỗi render bất ngờ ra TRANG TRẮNG, người
// dùng không có đường thoát. 2 file này (app/error.tsx, app/global-error.tsx) là error boundary Next.js
// tự động bọc quanh route con / root layout — test ở đây xác nhận UI hiện đúng và `reset()` được gọi.
describe('app/error.tsx — error boundary cho route con', () => {
  const testError = Object.assign(new Error('Lỗi giả lập'), { digest: 'abc123' });

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('hiện thông điệp thân thiện, không lộ chi tiết lỗi/stack trace', () => {
    render(<RouteError error={testError} reset={vi.fn()} />);
    expect(screen.getByText('Đã có lỗi xảy ra')).toBeInTheDocument();
    expect(screen.queryByText(/Lỗi giả lập/)).not.toBeInTheDocument();
  });

  it("bấm 'Thử lại' gọi reset()", async () => {
    const reset = vi.fn();
    render(<RouteError error={testError} reset={reset} />);
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it('có link về trang chủ', () => {
    render(<RouteError error={testError} reset={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Về trang chủ' })).toHaveAttribute('href', '/');
  });

  it('log lỗi ra console để điều tra (không nuốt lỗi)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<RouteError error={testError} reset={vi.fn()} />);
    expect(spy).toHaveBeenCalledWith('Lỗi render trang:', testError);
  });
});

describe('app/global-error.tsx — error boundary cho lỗi ở root layout', () => {
  const testError = Object.assign(new Error('Lỗi layout gốc'), { digest: 'xyz789' });

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("hiện thông điệp thân thiện và nút 'Thử lại' gọi reset()", async () => {
    const reset = vi.fn();
    render(<GlobalError error={testError} reset={reset} />);
    expect(screen.getByText('Đã có lỗi xảy ra')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it('log lỗi ra console để điều tra', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<GlobalError error={testError} reset={vi.fn()} />);
    expect(spy).toHaveBeenCalledWith('Lỗi ở root layout:', testError);
  });
});
