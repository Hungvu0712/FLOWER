import type { AxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, onSessionExpired } from '@/lib/axios';

// Không dùng thư viện mock adapter — thay thẳng `adapter` của axios instance để kiểm soát hoàn toàn
// từng lượt request. Đây là cách kiểm thử interceptor mà không cần server thật.
type Handler = (config: AxiosRequestConfig) => Promise<unknown>;

let handler: Handler;
const calls: string[] = [];

function respond(status: number, data: unknown = {}) {
  return (config: AxiosRequestConfig) => {
    const response = { data, status, statusText: '', headers: {}, config };
    return status >= 200 && status < 300
      ? Promise.resolve(response)
      : Promise.reject(
          Object.assign(new Error(`Request failed with status ${status}`), {
            config,
            response,
            isAxiosError: true,
          }),
        );
  };
}

beforeEach(() => {
  calls.length = 0;
  api.defaults.adapter = (async (config: AxiosRequestConfig) => {
    calls.push(`${(config.method ?? 'get').toUpperCase()} ${config.url}`);
    return handler(config);
  }) as never;
});

describe('cấu hình instance', () => {
  it('bật withCredentials để trình duyệt tự gửi cookie httpOnly', () => {
    expect(api.defaults.withCredentials).toBe(true);
  });

  it('baseURL lấy từ NEXT_PUBLIC_API_URL', () => {
    expect(api.defaults.baseURL).toBe('http://localhost:4000');
  });
});

describe('interceptor tự refresh khi gặp 401', () => {
  it('refresh xong thì RETRY request gốc và trả kết quả (không treo promise)', async () => {
    let meCallCount = 0;
    handler = (config) => {
      if (config.url?.includes('/auth/refresh')) return respond(200)(config);
      meCallCount += 1;
      return meCallCount === 1
        ? respond(401)(config)
        : respond(200, { data: { id: 'u1' } })(config);
    };

    const res = await api.get('/api/v1/account/me');

    expect(res.data).toEqual({ data: { id: 'u1' } });
    expect(calls).toEqual([
      'GET /api/v1/account/me',
      'POST /api/v1/auth/refresh',
      'GET /api/v1/account/me',
    ]);
  });

  it('nhiều request 401 cùng lúc chỉ gọi refresh MỘT lần (xếp hàng chờ)', async () => {
    const seen: Record<string, number> = {};
    handler = (config) => {
      if (config.url?.includes('/auth/refresh')) return respond(200)(config);
      const url = config.url!;
      seen[url] = (seen[url] ?? 0) + 1;
      return seen[url] === 1 ? respond(401)(config) : respond(200, { ok: url })(config);
    };

    const results = await Promise.all([
      api.get('/api/v1/account/me'),
      api.get('/api/v1/account/sessions'),
      api.get('/api/v1/admin/categories'),
    ]);

    expect(results.map((r) => r.data)).toEqual([
      { ok: '/api/v1/account/me' },
      { ok: '/api/v1/account/sessions' },
      { ok: '/api/v1/admin/categories' },
    ]);
    expect(calls.filter((c) => c.includes('/auth/refresh'))).toHaveLength(1);
  });

  it('refresh thất bại → trả 401 cho caller, KHÔNG tự redirect (khách vãng lai ở trang public là bình thường)', async () => {
    handler = (config) => respond(401)(config);
    await expect(api.get('/api/v1/account/me')).rejects.toMatchObject({
      response: { status: 401 },
    });
  });

  it('KHÔNG refresh cho chính endpoint /auth/* (tránh lặp vô hạn)', async () => {
    handler = (config) => respond(401)(config);
    await expect(api.post('/api/v1/auth/login', {})).rejects.toBeDefined();
    expect(calls).toEqual(['POST /api/v1/auth/login']);
  });

  it('chỉ thử refresh MỘT lần cho mỗi request (không lặp vô hạn khi vẫn 401 sau refresh)', async () => {
    handler = (config) =>
      config.url?.includes('/auth/refresh') ? respond(200)(config) : respond(401)(config);
    await expect(api.get('/api/v1/account/me')).rejects.toBeDefined();
    expect(calls.filter((c) => c.includes('/auth/refresh'))).toHaveLength(1);
  });

  it('lỗi khác 401 (403, 500) được trả thẳng, không kích hoạt refresh', async () => {
    for (const status of [403, 404, 409, 500]) {
      calls.length = 0;
      handler = (config) => respond(status)(config);
      await expect(api.get('/api/v1/superadmin/users')).rejects.toMatchObject({
        response: { status },
      });
      expect(calls).toEqual(['GET /api/v1/superadmin/users']);
    }
  });

  it('request thành công đi thẳng, không đụng interceptor lỗi', async () => {
    handler = (config) => respond(200, { success: true })(config);
    expect((await api.get('/api/v1/categories')).data).toEqual({ success: true });
    expect(calls).toHaveLength(1);
  });
});

// Refresh trả lời chậm một nhịp — để các request 401 còn lại kịp vào hàng đợi trong lúc đang refresh,
// đúng tình huống thật (Nav và trang login cùng gọi /account/me một lúc).
function delayedRefresh(status: number) {
  return (config: AxiosRequestConfig) =>
    new Promise((resolve) => setTimeout(resolve, 10)).then(() => respond(status)(config));
}

// Promise treo vĩnh viễn không bao giờ fail test theo cách bình thường — chạy đua với timeout để biến
// "treo" thành một giá trị kiểm tra được.
function settleWithin(promise: Promise<unknown>, ms = 500) {
  return Promise.race([
    promise.then(
      () => 'resolved',
      (e) => `rejected ${e?.response?.status}`,
    ),
    new Promise((resolve) => setTimeout(() => resolve('TREO'), ms)),
  ]);
}

describe('refresh thất bại — phiên đã chết (docs/12 FE-09)', () => {
  it('MỌI request đang xếp hàng chờ refresh đều bị reject, không treo promise', async () => {
    handler = (config) =>
      config.url?.includes('/auth/refresh') ? delayedRefresh(401)(config) : respond(401)(config);

    const outcomes = await Promise.all([
      settleWithin(api.get('/api/v1/account/me')),
      settleWithin(api.get('/api/v1/account/me')),
      settleWithin(api.get('/api/v1/account/sessions')),
    ]);

    expect(outcomes).toEqual(['rejected 401', 'rejected 401', 'rejected 401']);
    expect(calls.filter((c) => c.includes('/auth/refresh'))).toHaveLength(1);
  });

  it('refresh trả 401 → báo onSessionExpired đúng MỘT lần dù nhiều request cùng 401', async () => {
    const listener = vi.fn();
    const unsubscribe = onSessionExpired(listener);
    handler = (config) =>
      config.url?.includes('/auth/refresh') ? delayedRefresh(401)(config) : respond(401)(config);

    await Promise.allSettled([api.get('/api/v1/account/me'), api.get('/api/v1/account/sessions')]);

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('refresh trả 403 (tài khoản bị khoá) → cũng là phiên chết', async () => {
    const listener = vi.fn();
    const unsubscribe = onSessionExpired(listener);
    handler = (config) =>
      config.url?.includes('/auth/refresh') ? respond(403)(config) : respond(401)(config);

    await api.get('/api/v1/account/me').catch(() => {});

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it.each([500, 429])(
    'refresh lỗi %i → KHÔNG báo hết phiên (phiên có thể vẫn còn, tránh đăng xuất nhầm)',
    async (status) => {
      const listener = vi.fn();
      const unsubscribe = onSessionExpired(listener);
      handler = (config) =>
        config.url?.includes('/auth/refresh') ? respond(status)(config) : respond(401)(config);

      await api.get('/api/v1/account/me').catch(() => {});

      expect(listener).not.toHaveBeenCalled();
      unsubscribe();
    },
  );

  it('lỗi mạng khi refresh (không có response) → KHÔNG báo hết phiên', async () => {
    const listener = vi.fn();
    const unsubscribe = onSessionExpired(listener);
    handler = (config) =>
      config.url?.includes('/auth/refresh')
        ? Promise.reject(Object.assign(new Error('Network Error'), { config, isAxiosError: true }))
        : respond(401)(config);

    await api.get('/api/v1/account/me').catch(() => {});

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('refresh thành công → KHÔNG báo hết phiên', async () => {
    const listener = vi.fn();
    const unsubscribe = onSessionExpired(listener);
    let meCalls = 0;
    handler = (config) => {
      if (config.url?.includes('/auth/refresh')) return respond(200)(config);
      meCalls += 1;
      return meCalls === 1 ? respond(401)(config) : respond(200)(config);
    };

    await api.get('/api/v1/account/me');

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('huỷ đăng ký (hàm trả về từ onSessionExpired) → không nhận thông báo nữa', async () => {
    const listener = vi.fn();
    onSessionExpired(listener)();
    handler = (config) => respond(401)(config);

    await api.get('/api/v1/account/me').catch(() => {});

    expect(listener).not.toHaveBeenCalled();
  });
});
