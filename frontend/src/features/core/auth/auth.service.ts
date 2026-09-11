import { api } from '@/lib/axios';
import type {
  LoginInput,
  RegisterInput,
  MagicLinkRequestInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.schemas';

// Chỉ chứa lời gọi axios thuần (không React) — tái sử dụng được ngoài component (test, script).
export type LoginMethod = {
  method: 'google_oauth' | 'email_password' | 'magic_link';
  isEnabled: boolean;
};
export type AuthUser = { id: string; fullName: string; email: string; roles?: string[] };

export const authService = {
  getLoginMethods: () =>
    api.get<{ data: LoginMethod[] }>('/api/v1/auth/login-methods').then((r) => r.data.data),

  login: (input: LoginInput) =>
    api.post<{ data: { user: AuthUser } }>('/api/v1/auth/login', input).then((r) => r.data.data),

  register: (input: RegisterInput) =>
    api.post<{ data: { user: AuthUser } }>('/api/v1/auth/register', input).then((r) => r.data.data),

  requestMagicLink: (input: MagicLinkRequestInput) =>
    api.post('/api/v1/auth/magic-link/request', input),

  verifyMagicLink: (token: string) =>
    api
      .post<{ data: { user: AuthUser } }>('/api/v1/auth/magic-link/verify', { token })
      .then((r) => r.data.data),

  loginWithGoogle: (idToken: string) =>
    api
      .post<{ data: { user: AuthUser } }>('/api/v1/auth/google', { idToken })
      .then((r) => r.data.data),

  logout: () => api.post('/api/v1/auth/logout'),

  forgotPassword: (input: ForgotPasswordInput) => api.post('/api/v1/auth/forgot-password', input),

  resetPassword: (token: string, input: ResetPasswordInput) =>
    api.post('/api/v1/auth/reset-password', { token, ...input }),
};
