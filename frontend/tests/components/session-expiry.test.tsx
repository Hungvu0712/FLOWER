import type { AxiosRequestConfig } from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Dùng axios/service/hook THẬT (chỉ thay adapter như tests/unit/axios.test.ts) — lỗi FE-08/FE-09 nằm
// đúng ở chỗ các tầng này phối hợp với nhau (interceptor ↔ cache React Query ↔ trang login), mock riêng
// từng tầng sẽ không tái hiện được. Chỉ mock phần phụ thuộc Next.js runtime.
const router = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  refresh: vi.fn(),
};
let searchParams = new URLSearchParams();
let pathname = '/';
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => searchParams,
  usePathname: () => pathname,
}));
// jsdom không điều hướng thật được (window.location.replace không định nghĩa lại được) — mock đúng 1 hàm
// điều hướng cứng dùng sau khi trạng thái đăng nhập đổi.
const hardRedirect = vi.fn();
vi.mock('@/lib/navigation', () => ({ hardRedirect: (url: string) => hardRedirect(url) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { api } = await import('@/lib/axios');
const { useSessionExpiredHandler } = await import('@/features/core/auth/auth.hooks');
const { useMe } = await import('@/features/core/account/account.hooks');
const { Nav } = await import('@/components/layout/Nav');
const { default: LoginPage } = await import('@/app/(auth)/login/page');
const { AdminShell } = await import('@/components/admin/AdminShell');

const USER = {
  id: 'u1',
  fullName: 'Super Admin',
  email: 'superadmin@example.com',
  phone: null,
  avatarFile: null,
  roles: ['super_admin'],
  permissions: [],
};

type Routes = Record<string, () => { status: number; data?: unknown }>;
let routes: Routes;
const calls: string[] = [];

function reply(config: AxiosRequestConfig, status: number, data: unknown = {}) {
  const response = { data, status, statusText: '', headers: {}, config };
  return status < 300
    ? Promise.resolve(response)
    : Promise.reject(
        Object.assign(new Error(`Request failed with status ${status}`), {
          config,
          response,
          isAxiosError: true,
        }),
      );
}

const SESSION_DEAD: Routes = {
  '/api/v1/account/me': () => ({ status: 401 }),
  '/api/v1/auth/refresh': () => ({ status: 401 }),
};

let queryClient: QueryClient;

function SessionExpiredHandler() {
  useSessionExpiredHandler();
  return null;
}

function renderWithProviders(ui: ReactNode) {
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionExpiredHandler />
      {ui}
    </QueryClientProvider>,
  );
}

// Cache đang giữ user từ lúc phiên còn sống — cũ hơn staleTime, đúng như sau 5 phút access token hết hạn.
function seedStaleUser() {
  queryClient.setQueryData(['account', 'me'], USER, { updatedAt: Date.now() - 5 * 60_000 });
}

function setBrowserUrl(url: string) {
  window.history.replaceState({}, '', url);
}

beforeEach(() => {
  calls.length = 0;
  router.push.mockReset();
  router.replace.mockReset();
  hardRedirect.mockReset();
  searchParams = new URLSearchParams();
  pathname = '/';
  setBrowserUrl('/');
  routes = {
    '/api/v1/auth/login-methods': () => ({
      status: 200,
      data: { data: [{ method: 'email_password', isEnabled: true }] },
    }),
    '/api/v1/account/me': () => ({ status: 200, data: { data: USER } }),
  };
  api.defaults.adapter = (async (config: AxiosRequestConfig) => {
    calls.push(`${(config.method ?? 'get').toUpperCase()} ${config.url}`);
    const route = routes[config.url!];
    const { status, data } = route ? route() : { status: 404, data: undefined };
    return reply(config, status, data);
  }) as never;
  queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: false }, mutations: { retry: false } },
  });
});

function RefetchMeButton() {
  const { refetch } = useMe();
  return <button onClick={() => refetch()}>refetch-me</button>;
}

describe('header sau khi phiên chết (docs/12 FE-09)', () => {
  it('Nav đang hiện tên user → refresh token chết → Nav chuyển về link "Đăng nhập"', async () => {
    renderWithProviders(
      <>
        <Nav />
        <RefetchMeButton />
      </>,
    );
    const header = screen.getByRole('banner');
    await within(header).findByText('Super Admin');

    routes = { ...routes, ...SESSION_DEAD };
    await userEvent.click(screen.getByText('refetch-me'));

    await within(header).findByRole('link', { name: 'Đăng nhập' });
    expect(within(header).queryByText('Super Admin')).not.toBeInTheDocument();
    expect(queryClient.getQueryData(['account', 'me'])).toBeNull();
  });

  it('phiên chết khi đang đứng ở trang cần đăng nhập → đưa về /login kèm ?redirectTo', async () => {
    pathname = '/account/profile'; // window.location cố ý để '/' — handler phải theo route, không theo nó
    seedStaleUser();
    routes = { ...routes, ...SESSION_DEAD };
    renderWithProviders(<RefetchMeButton />);

    await userEvent.click(screen.getByText('refetch-me'));

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/login?redirectTo=%2Faccount%2Fprofile'),
    );
  });

  it('phiên chết khi đang ở trang công khai → chỉ xoá user khỏi cache, KHÔNG điều hướng', async () => {
    pathname = '/san-pham/hoa-hong';
    seedStaleUser();
    routes = { ...routes, ...SESSION_DEAD };
    renderWithProviders(<RefetchMeButton />);

    await userEvent.click(screen.getByText('refetch-me'));

    await waitFor(() => expect(queryClient.getQueryData(['account', 'me'])).toBeNull());
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('refresh lỗi 500 (backend trục trặc, phiên CHƯA chắc đã chết) → giữ nguyên user, không đăng xuất nhầm', async () => {
    pathname = '/account/profile';
    seedStaleUser();
    routes = {
      ...routes,
      '/api/v1/account/me': () => ({ status: 401 }),
      '/api/v1/auth/refresh': () => ({ status: 500 }),
    };
    renderWithProviders(<RefetchMeButton />);

    await userEvent.click(screen.getByText('refetch-me'));

    await waitFor(() => expect(calls).toContain('POST /api/v1/auth/refresh'));
    await waitFor(() => expect(queryClient.getQueryState(['account', 'me'])?.status).toBe('error'));
    expect(queryClient.getQueryData(['account', 'me'])).toEqual(USER);
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('trang login khi bị đá về do hết phiên (docs/12 FE-08)', () => {
  beforeEach(() => {
    // Điều hướng phía client: useSearchParams() đã là URL MỚI, còn window.location vẫn là trang CŨ —
    // đúng thứ tự thật đã tái hiện bằng log (trang login render trước khi thanh địa chỉ đổi).
    searchParams = new URLSearchParams({ redirectTo: '/account/devices' });
    pathname = '/login';
    setBrowserUrl('/account/profile');
  });

  it('cache còn user CŨ nhưng refresh token đã chết → ở lại /login, KHÔNG bị đẩy đi đâu', async () => {
    seedStaleUser();
    routes = { ...routes, ...SESSION_DEAD };
    renderWithProviders(<LoginPage />);

    await waitFor(() => expect(calls).toContain('POST /api/v1/auth/refresh'));
    await waitFor(() => expect(queryClient.getQueryData(['account', 'me'])).toBeNull());
    expect(hardRedirect).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('refresh ngầm thành công → quay về ĐÚNG ?redirectTo, không bật nhầm về trang chủ', async () => {
    seedStaleUser();
    let meCalls = 0;
    routes = {
      ...routes,
      '/api/v1/account/me': () =>
        ++meCalls === 1 ? { status: 401 } : { status: 200, data: { data: USER } },
      '/api/v1/auth/refresh': () => ({ status: 200 }),
    };
    renderWithProviders(<LoginPage />);

    await waitFor(() => expect(hardRedirect).toHaveBeenCalledWith('/account/devices'));
    expect(hardRedirect).not.toHaveBeenCalledWith('/');
  });

  // router.replace/push lúc này dùng lại redirect-về-/login mà Client Cache của Next.js còn giữ từ lúc
  // chưa đăng nhập → đứng im ở /login (tái hiện bằng trace network thật). Phải tải lại trang.
  it('KHÔNG điều hướng mềm bằng router sau khi phiên được phục hồi (Client Cache còn giữ redirect cũ)', async () => {
    seedStaleUser();
    let meCalls = 0;
    routes = {
      ...routes,
      '/api/v1/account/me': () =>
        ++meCalls === 1 ? { status: 401 } : { status: 200, data: { data: USER } },
      '/api/v1/auth/refresh': () => ({ status: 200 }),
    };
    renderWithProviders(<LoginPage />);

    await waitFor(() => expect(hardRedirect).toHaveBeenCalled());
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('đăng nhập bằng form → về đúng ?redirectTo', async () => {
    routes = {
      ...routes,
      ...SESSION_DEAD,
      '/api/v1/auth/login': () => ({ status: 200, data: { data: { user: USER } } }),
    };
    renderWithProviders(<LoginPage />);

    await userEvent.type(await screen.findByLabelText('Email'), 'superadmin@example.com');
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'ChangeMe123!');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => expect(hardRedirect).toHaveBeenCalledWith('/account/devices'));
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('AdminShell — không mở cổng bằng role cũ trong cache (docs/12 FE-09)', () => {
  it('refetch /account/me lỗi → KHÔNG render nội dung trang dù cache còn role super_admin', async () => {
    pathname = '/admin';
    setBrowserUrl('/admin');
    seedStaleUser();
    routes = {
      ...routes,
      '/api/v1/account/me': () => ({ status: 401 }),
      '/api/v1/auth/refresh': () => ({ status: 500 }),
    };
    renderWithProviders(
      <AdminShell>
        <p>noi-dung-trang-admin</p>
      </AdminShell>,
    );

    await waitFor(() => expect(calls).toContain('POST /api/v1/auth/refresh'));
    await waitFor(() => expect(queryClient.getQueryState(['account', 'me'])?.status).toBe('error'));
    expect(screen.queryByText('noi-dung-trang-admin')).not.toBeInTheDocument();
    expect(screen.getByText('Đang kiểm tra quyền truy cập...')).toBeInTheDocument();
  });

  it('refetch thành công → render nội dung trang như bình thường', async () => {
    pathname = '/admin';
    setBrowserUrl('/admin');
    renderWithProviders(
      <AdminShell>
        <p>noi-dung-trang-admin</p>
      </AdminShell>,
    );

    expect(await screen.findByText('noi-dung-trang-admin')).toBeInTheDocument();
  });
});
