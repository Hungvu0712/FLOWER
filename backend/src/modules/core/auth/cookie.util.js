const env = require('../../../config/env');

const baseCookieOptions = {
  httpOnly: true,
  secure: env.isProd, // bắt buộc HTTPS ở production
  sameSite: 'lax',
};

function setAuthCookies(res, { accessToken, refreshToken, refreshTokenExpiresAt }) {
  res.cookie('access_token', accessToken, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000, // khớp JWT_ACCESS_EXPIRES_IN mặc định 15m
    path: '/',
  });
  res.cookie('refresh_token', refreshToken, {
    ...baseCookieOptions,
    expires: refreshTokenExpiresAt,
    path: '/api/auth', // chỉ gửi kèm khi gọi các endpoint auth (refresh/logout) — giảm bề mặt lộ token
  });
}

function clearAuthCookies(res) {
  res.clearCookie('access_token', { ...baseCookieOptions, path: '/' });
  res.clearCookie('refresh_token', { ...baseCookieOptions, path: '/api/auth' });
}

module.exports = { setAuthCookies, clearAuthCookies };
