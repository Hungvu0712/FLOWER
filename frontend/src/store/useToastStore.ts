import { create } from 'zustand';

// Toast tối giản dùng chung toàn app (đăng ký, đăng xuất, các thao tác admin...) — không phụ thuộc
// thư viện ngoài. Toast tự biến mất sau 3s, hoặc bấm để đóng ngay.
export type Toast = { id: number; message: string; type: 'success' | 'error' };

type ToastState = {
  toasts: Toast[];
  push: (message: string, type?: Toast['type']) => void;
  dismiss: (id: number) => void;
};

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, type = 'success') => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
