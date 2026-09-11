import type { CookieOptions, Response } from "express";
import { env } from "../../../config/env";

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.isProd, // bắt buộc HTTPS ở production
  sameSite: "lax",
};

const DURATION_UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

// Parse "5m"/"15m"/"1h" (định dạng JWT_ACCESS_EXPIRES_IN, cùng cú pháp jsonwebtoken chấp nhận) thành ms —
// tránh hardcode trùng lặp giá trị này ở đây, dễ bị lệch với JWT thật khi đổi env (đã từng xảy ra).
function parseDurationMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match)
    throw new Error(
      `Không parse được thời hạn "${value}" — dùng dạng số + đơn vị s/m/h/d, vd "5m"`,
    );
  return Number(match[1]) * DURATION_UNIT_MS[match[2]!]!;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export function setAuthCookies(
  res: Response,
  { accessToken, refreshToken, refreshTokenExpiresAt }: SessionTokens,
): void {
  res.cookie("access_token", accessToken, {
    ...baseCookieOptions,
    maxAge: parseDurationMs(env.jwt.accessExpiresIn),
    path: "/",
  });
  res.cookie("refresh_token", refreshToken, {
    ...baseCookieOptions,
    expires: refreshTokenExpiresAt,
    // Path '/api/v1' (không hẹp hơn) — phải bao phủ cả /api/v1/account/sessions vì listSessions/
    // revokeOtherSessions cần đọc cookie này để biết "phiên hiện tại" là phiên nào. Từng để '/api/v1/auth'
    // hẹp hơn, khiến 2 endpoint đó luôn nhận currentRefreshToken=undefined — vừa làm badge "Hiện tại"
    // không bao giờ đúng, vừa khiến revokeOtherSessions xoá NHẦM luôn cả phiên đang dùng (bug thật, phát
    // hiện qua test). Vẫn hẹp hơn nhiều so với path gốc '/', và cookie vẫn httpOnly nên JS/XSS không đọc được.
    path: "/api/v1",
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie("access_token", { ...baseCookieOptions, path: "/" });
  res.clearCookie("refresh_token", { ...baseCookieOptions, path: "/api/v1" });
}
