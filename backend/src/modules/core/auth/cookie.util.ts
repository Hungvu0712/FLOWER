import type { CookieOptions, Response } from 'express';
import { env } from '../../../config/env';

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.isProd, // bắt buộc HTTPS ở production
  sameSite: 'lax',
};

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export function setAuthCookies(res: Response, { accessToken, refreshToken, refreshTokenExpiresAt }: SessionTokens): void {
  res.cookie('access_token', accessToken, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000, // khớp JWT_ACCESS_EXPIRES_IN mặc định 15m
    path: '/',
  });
  res.cookie('refresh_token', refreshToken, {
    ...baseCookieOptions,
    expires: refreshTokenExpiresAt,
    path: '/api/v1/auth', // chỉ gửi kèm khi gọi các endpoint auth (refresh/logout) — giảm bề mặt lộ token
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('access_token', { ...baseCookieOptions, path: '/' });
  res.clearCookie('refresh_token', { ...baseCookieOptions, path: '/api/v1/auth' });
}
