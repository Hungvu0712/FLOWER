import { create } from 'zustand';

// Dialog xác nhận dùng chung toàn app — thay cho window.confirm() mặc định của trình duyệt (không
// theo được design system). Gọi confirmDialog(message) ở bất kỳ đâu, await kết quả true/false.
type ConfirmState = {
  open: boolean;
  title: string;
  message: string;
  danger: boolean;
  resolve: ((value: boolean) => void) | null;
};

type ConfirmOptions = { title?: string; danger?: boolean };

type ConfirmStore = ConfirmState & {
  request: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  handle: (result: boolean) => void;
};

export const useConfirmStore = create<ConfirmStore>((set, get) => ({
  open: false,
  title: 'Xác nhận',
  message: '',
  danger: false,
  resolve: null,
  request: (message, options) =>
    new Promise<boolean>((resolve) => {
      set({
        open: true,
        title: options?.title ?? 'Xác nhận',
        message,
        danger: options?.danger ?? false,
        resolve,
      });
    }),
  handle: (result) => {
    get().resolve?.(result);
    set({ open: false, resolve: null });
  },
}));

export function confirmDialog(message: string, options?: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().request(message, options);
}
