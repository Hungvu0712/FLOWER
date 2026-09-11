import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/axios', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const { api } = await import('@/lib/axios');
const { authService } = await import('@/features/core/auth/auth.service');
const { accountService } = await import('@/features/core/account/account.service');
const { categoriesService } = await import('@/features/domain/categories/categories.service');
const { adminUsersService } = await import('@/features/core/admin-users/adminUsers.service');
const { foldersService } = await import('@/features/core/files/folders.service');
const { filesService } = await import('@/features/core/files/files.service');
const { systemSettingsService } = await import('@/features/core/admin-settings/systemSettings.service');

// `api.get/post/...` là hàm generic có nhiều overload nên `vi.mocked()` không suy ra được kiểu mock —
// ép kiểu tường minh sang Mock để dùng `.mockReturnValue()` / `.mock.calls`.
const mocked = api as unknown as Record<'get' | 'post' | 'patch' | 'delete', Mock>;

beforeEach(() => {
  mocked.get.mockReset();
  mocked.post.mockReset();
  mocked.patch.mockReset();
  mocked.delete.mockReset();
});

// Backend luôn trả envelope { success, message, data } — service phải bóc đúng `data` để
// component/hook không phải biết về envelope. Xem docs/03-backend.md §4.
function envelope<T>(data: T) {
  return Promise.resolve({ data: { success: true, message: 'Success', data } });
}

describe('authService', () => {
  it('mọi endpoint đều gọi đúng đường dẫn có prefix /api/v1', async () => {
    mocked.get.mockReturnValue(envelope([]) as never);
    mocked.post.mockReturnValue(envelope({ user: { id: 'u1' } }) as never);

    await authService.getLoginMethods();
    await authService.login({ email: 'a@x.com', password: 'p' } as never);
    await authService.register({ fullName: 'A', email: 'a@x.com', password: '12345678' } as never);
    await authService.logout();

    expect(mocked.get.mock.calls[0]![0]).toBe('/api/v1/auth/login-methods');
    expect(mocked.post.mock.calls.map((c: unknown[]) => c[0])).toEqual([
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/auth/logout',
    ]);
  });

  it('bóc đúng lớp data lồng nhau của envelope', async () => {
    mocked.post.mockReturnValue(envelope({ user: { id: 'u1', email: 'a@x.com' } }) as never);
    expect(await authService.login({ email: 'a@x.com', password: 'p' } as never)).toEqual({
      user: { id: 'u1', email: 'a@x.com' },
    });
  });

  it('resetPassword gộp token vào body cùng mật khẩu mới', async () => {
    mocked.post.mockReturnValue(envelope(null) as never);
    await authService.resetPassword('token-abc', { newPassword: 'matkhaumoi' } as never);
    expect(mocked.post).toHaveBeenCalledWith('/api/v1/auth/reset-password', {
      token: 'token-abc',
      newPassword: 'matkhaumoi',
    });
  });

  it('KHÔNG tự gắn Authorization header (token nằm ở cookie httpOnly)', async () => {
    mocked.post.mockReturnValue(envelope({ user: {} }) as never);
    await authService.login({ email: 'a@x.com', password: 'p' } as never);
    expect(JSON.stringify(mocked.post.mock.calls)).not.toContain('Authorization');
  });
});

describe('accountService', () => {
  it('getMe trả thẳng object user (đã bóc envelope)', async () => {
    mocked.get.mockReturnValue(envelope({ id: 'u1', roles: ['member'], permissions: [] }) as never);
    expect(await accountService.getMe()).toMatchObject({ id: 'u1', roles: ['member'] });
  });

  it('revokeSession gọi DELETE đúng id', async () => {
    mocked.delete.mockReturnValue(envelope(null) as never);
    await accountService.revokeSession('sess-9');
    expect(mocked.delete).toHaveBeenCalledWith('/api/v1/account/sessions/sess-9');
  });

  it('revokeOtherSessions gọi DELETE không kèm id (endpoint tập thể)', async () => {
    mocked.delete.mockReturnValue(envelope(null) as never);
    await accountService.revokeOtherSessions();
    expect(mocked.delete).toHaveBeenCalledWith('/api/v1/account/sessions');
  });
});

describe('categoriesService', () => {
  it('list gọi endpoint ADMIN (không phải endpoint công khai) và truyền params', async () => {
    mocked.get.mockReturnValue(envelope([]) as never);
    await categoriesService.list({ includeInactive: true });
    expect(mocked.get).toHaveBeenCalledWith('/api/v1/admin/categories', {
      params: { includeInactive: true },
    });
  });

  it('update gọi PATCH theo id', async () => {
    mocked.patch.mockReturnValue(envelope({}) as never);
    await categoriesService.update('cat-1', { name: 'Tên mới' });
    expect(mocked.patch).toHaveBeenCalledWith('/api/v1/admin/categories/cat-1', {
      name: 'Tên mới',
    });
  });

  it('remove gọi DELETE theo id', async () => {
    mocked.delete.mockReturnValue(envelope(null) as never);
    await categoriesService.remove('cat-1');
    expect(mocked.delete).toHaveBeenCalledWith('/api/v1/admin/categories/cat-1');
  });
});

describe('foldersService', () => {
  it('list gọi GET /api/v1/folders kèm parentId (bỏ trống = cấp gốc)', async () => {
    mocked.get.mockReturnValue(envelope([]) as never);
    await foldersService.list('folder-1');
    expect(mocked.get).toHaveBeenCalledWith('/api/v1/folders', { params: { parentId: 'folder-1' } });

    await foldersService.list();
    expect(mocked.get).toHaveBeenLastCalledWith('/api/v1/folders', { params: { parentId: undefined } });
  });

  it('create/update/remove gọi đúng method và path', async () => {
    mocked.post.mockReturnValue(envelope({ id: 'f1' }) as never);
    await foldersService.create({ name: 'Ảnh sản phẩm', parentId: null });
    expect(mocked.post).toHaveBeenCalledWith('/api/v1/folders', {
      name: 'Ảnh sản phẩm',
      parentId: null,
    });

    mocked.patch.mockReturnValue(envelope({ id: 'f1' }) as never);
    await foldersService.update('f1', { name: 'Tên mới' });
    expect(mocked.patch).toHaveBeenCalledWith('/api/v1/folders/f1', { name: 'Tên mới' });

    mocked.delete.mockReturnValue(envelope(null) as never);
    await foldersService.remove('f1');
    expect(mocked.delete).toHaveBeenCalledWith('/api/v1/folders/f1');
  });
});

describe('filesService — list (docs/12 Phase 4, màn quản lý tài nguyên)', () => {
  it('bỏ trống folderId → gọi API KHÔNG kèm folderId (backend hiểu là cấp gốc)', async () => {
    mocked.get.mockReturnValue(
      Promise.resolve({
        data: { success: true, data: [], meta: { page: 1, limit: 24, total: 0, totalPages: 1 } },
      }) as never,
    );
    await filesService.list();
    expect(mocked.get).toHaveBeenCalledWith('/api/v1/files', {
      params: { folderId: undefined, view: 'grid', page: 1, limit: 24 },
    });
  });

  it('có folderId → truyền đúng kèm view/page/limit tuỳ chỉnh', async () => {
    mocked.get.mockReturnValue(
      Promise.resolve({
        data: { success: true, data: [], meta: { page: 2, limit: 12, total: 0, totalPages: 1 } },
      }) as never,
    );
    await filesService.list({ folderId: 'folder-1', view: 'list', page: 2, limit: 12 });
    expect(mocked.get).toHaveBeenCalledWith('/api/v1/files', {
      params: { folderId: 'folder-1', view: 'list', page: 2, limit: 12 },
    });
  });
});

describe('systemSettingsService (docs/12, Phase 4)', () => {
  it('list gọi GET /api/v1/superadmin/settings', async () => {
    mocked.get.mockReturnValue(envelope([]) as never);
    await systemSettingsService.list();
    expect(mocked.get).toHaveBeenCalledWith('/api/v1/superadmin/settings');
  });

  it('update gọi PATCH đúng key, gửi value trong body', async () => {
    mocked.patch.mockReturnValue(
      envelope({ key: 'site_name', value: 'Tên mới', updatedAt: '2026-01-01' }) as never,
    );
    await systemSettingsService.update('site_name', 'Tên mới');
    expect(mocked.patch).toHaveBeenCalledWith('/api/v1/superadmin/settings/site_name', {
      value: 'Tên mới',
    });
  });

  it('update site_logo gửi fileId (không phải object {fileId,url} của response GET)', async () => {
    mocked.patch.mockReturnValue(envelope({ key: 'site_logo', value: null }) as never);
    await systemSettingsService.update('site_logo', 'file-123');
    expect(mocked.patch).toHaveBeenCalledWith('/api/v1/superadmin/settings/site_logo', {
      value: 'file-123',
    });
  });
});

describe('adminUsersService', () => {
  it('gọi đúng nhánh /superadmin/users (khác /admin — quản trị hệ thống)', async () => {
    mocked.get.mockReturnValue(
      Promise.resolve({
        data: { success: true, data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } },
      }) as never,
    );
    await adminUsersService.list({ page: 1, limit: 20 } as never);
    expect(mocked.get.mock.calls[0]![0]).toContain('/api/v1/superadmin/users');
  });
});
