import { create } from 'zustand';

// Chỉ lưu state UI cần chia sẻ toàn cục (ai đang đăng nhập, để hiện avatar/menu) — KHÔNG dùng để cache
// dữ liệu server (đó là việc của React Query, xem features/core/account/account.hooks.ts).
// Xem ARCHITECTURE.md §13.3.
type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  avatarFile?: { url: string } | null;
  roles: string[];
};

type AuthState = {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
