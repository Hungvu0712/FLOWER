import { api } from '@/lib/axios';
import type {
  LoginInput,
  RegisterInput,
  MagicLinkRequestInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.schemas';

// Chỉ chứa lời gọi axios thuần (không React) — tái sử dụng được ngoài component (test, script).
// Xem ARCHITECTURE.md §7.3.
export type LoginMethod = { method: 'google_oauth' | 'email_password' | 'magic_link'; isEnabled: boolean };
export type AuthUser = { id: string; fullName: string; email: string; roles?: string[] };

export const authService = {
  getLoginMethods: () => api.get<{ data: LoginMethod[] }>('/api/auth/login-methods').then((r) => r.data.data),

  login: (input: LoginInput) => api.post<{ data: { user: AuthUser } }>('/api/auth/login', input).then((r) => r.data.data),

  register: (input: RegisterInput) =>
    api.post<{ data: { user: AuthUser } }>('/api/auth/register', input).then((r) => r.data.data),

  requestMagicLink: (input: MagicLinkRequestInput) => api.post('/api/auth/magic-link/request', input),

  verifyMagicLink: (token: string) =>
    api.post<{ data: { user: AuthUser } }>('/api/auth/magic-link/verify', { token }).then((r) => r.data.data),

  loginWithGoogle: (idToken: string) =>
    api.post<{ data: { user: AuthUser } }>('/api/auth/google', { idToken }).then((r) => r.data.data),

  logout: () => api.post('/api/auth/logout'),

  forgotPassword: (input: ForgotPasswordInput) => api.post('/api/auth/forgot-password', input),

  resetPassword: (token: string, input: ResetPasswordInput) =>
    api.post('/api/auth/reset-password', { token, ...input }),
};
