import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

// JWT CHỈ dùng để xác thực danh tính (sub = user id) — KHÔNG nhúng role/permission vào token. Mọi
// quyết định phân quyền (authorize()) luôn tra role/permission HIỆN TẠI từ DB qua authenticate
// middleware (xem core/middleware/authenticate.ts), để đổi role trong DB có hiệu lực ngay ở request
// tiếp theo — không cần đợi token hết hạn hay đăng nhập lại. Xem SECURITY.md §2, ARCHITECTURE.md §10.
export interface AccessTokenPayload {
  sub: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'] });
}

export function verifyAccessToken(token: string): AccessTokenPayload & jwt.JwtPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload & jwt.JwtPayload;
}
