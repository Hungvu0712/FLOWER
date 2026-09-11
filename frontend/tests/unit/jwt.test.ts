import { describe, expect, it } from 'vitest';
import { decodeAccessToken } from '@/lib/jwt';

// Tạo JWT giả (không cần chữ ký thật — hàm này CHỈ decode, không verify).
function fakeToken(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.chu-ky-gia`;
}

describe('decodeAccessToken', () => {
  it('đọc được sub và exp từ payload', () => {
    const exp = Math.floor(Date.now() / 1000) + 300;
    expect(decodeAccessToken(fakeToken({ sub: 'user-1', exp }))).toEqual({ sub: 'user-1', exp });
  });

  it('KHÔNG verify chữ ký — chỉ dùng cho UX, không phải ranh giới bảo mật', () => {
    const token = fakeToken({ sub: 'ke-tan-cong', exp: 9999999999 });
    expect(decodeAccessToken(token)?.sub).toBe('ke-tan-cong');
  });

  it('giải mã đúng base64url (ký tự - và _ thay cho + và /)', () => {
    const payload = { sub: '??>>~~ữ', exp: 1 };
    expect(decodeAccessToken(fakeToken(payload))?.exp).toBe(1);
  });

  it('trả null với chuỗi không phải JWT', () => {
    expect(decodeAccessToken('khong-phai-jwt')).toBeNull();
    expect(decodeAccessToken('')).toBeNull();
  });

  it('trả null khi payload không phải JSON hợp lệ', () => {
    expect(decodeAccessToken('aaa.bbb.ccc')).toBeNull();
  });
});
