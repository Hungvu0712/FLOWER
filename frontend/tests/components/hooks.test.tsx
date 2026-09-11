import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/core/account/account.service', () => ({
  accountService: {
    getMe: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    listSessions: vi.fn(),
    revokeSession: vi.fn(),
    revokeOtherSessions: vi.fn(),
  },
}));
vi.mock('@/features/domain/categories/categories.service', () => ({
  categoriesService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));
vi.mock('@/features/core/files/folders.service', () => ({
  foldersService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));
vi.mock('@/features/core/files/files.service', () => ({
  filesService: { upload: vi.fn(), list: vi.fn(), remove: vi.fn() },
}));
vi.mock('@/features/core/admin-settings/systemSettings.service', () => ({
  systemSettingsService: { list: vi.fn(), update: vi.fn() },
}));

const { accountService } = await import('@/features/core/account/account.service');
const { categoriesService } = await import('@/features/domain/categories/categories.service');
const { foldersService } = await import('@/features/core/files/folders.service');
const { filesService } = await import('@/features/core/files/files.service');
const { systemSettingsService } = await import('@/features/core/admin-settings/systemSettings.service');
const { useMe, useUpdateProfile } = await import('@/features/core/account/account.hooks');
const { useCategories, useDeleteCategory } =
  await import('@/features/domain/categories/categories.hooks');
const { useFolders, useCreateFolder, useDeleteFolder } =
  await import('@/features/core/files/folders.hooks');
const { useUploadFile, useDeleteFile } = await import('@/features/core/files/files.hooks');
const { useSystemSettings, useUpdateSystemSetting } =
  await import('@/features/core/admin-settings/systemSettings.hooks');
const { useToastStore } = await import('@/store/useToastStore');

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  useToastStore.setState({ toasts: [] });
  vi.mocked(accountService.getMe).mockReset();
  vi.mocked(categoriesService.list).mockReset();
  vi.mocked(categoriesService.remove).mockReset();
  vi.mocked(foldersService.list).mockReset();
  vi.mocked(foldersService.create).mockReset();
  vi.mocked(foldersService.remove).mockReset();
  vi.mocked(filesService.upload).mockReset();
  vi.mocked(filesService.remove).mockReset();
  vi.mocked(systemSettingsService.list).mockReset();
  vi.mocked(systemSettingsService.update).mockReset();
});

describe('useMe', () => {
  it('gọi accountService.getMe và trả dữ liệu', async () => {
    vi.mocked(accountService.getMe).mockResolvedValue({
      id: 'u1',
      roles: ['member'],
      permissions: [],
    } as never);
    const { result } = renderHook(() => useMe(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ id: 'u1', roles: ['member'] });
  });

  it('KHÔNG retry khi 401 — khách vãng lai ở trang public là bình thường, không phải lỗi tạm thời', async () => {
    vi.mocked(accountService.getMe).mockRejectedValue(new Error('401'));
    const { result } = renderHook(() => useMe(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(accountService.getMe).toHaveBeenCalledTimes(1);
  });

  it("dùng queryKey ['account','me'] để mọi nơi invalidate được thống nhất", async () => {
    vi.mocked(accountService.getMe).mockResolvedValue({ id: 'u1' } as never);
    renderHook(() => useMe(), { wrapper });
    await waitFor(() => expect(queryClient.getQueryData(['account', 'me'])).toBeDefined());
  });
});

describe('useUpdateProfile', () => {
  it("thành công → invalidate ['account','me'] và hiện toast", async () => {
    vi.mocked(accountService.updateProfile).mockResolvedValue({ id: 'u1' } as never);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateProfile(), { wrapper });
    result.current.mutate({ fullName: 'Tên mới' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['account', 'me'] });
    expect(useToastStore.getState().toasts[0]).toMatchObject({
      message: 'Đã lưu thay đổi',
      type: 'success',
    });
  });

  it('lỗi → hiện toast lỗi lấy đúng message backend trả về', async () => {
    const { AxiosError, AxiosHeaders } = await import('axios');
    const err = new AxiosError('failed');
    err.response = {
      data: { message: 'Số điện thoại đã được dùng' },
      status: 409,
      statusText: '',
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    };
    vi.mocked(accountService.updateProfile).mockRejectedValue(err);

    const { result } = renderHook(() => useUpdateProfile(), { wrapper });
    result.current.mutate({ fullName: 'X' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useToastStore.getState().toasts[0]).toMatchObject({
      message: 'Số điện thoại đã được dùng',
      type: 'error',
    });
  });
});

describe('useCategories', () => {
  it('truyền params vào service và đưa params vào queryKey (cache theo bộ lọc)', async () => {
    vi.mocked(categoriesService.list).mockResolvedValue([] as never);
    const { result } = renderHook(() => useCategories({ includeInactive: true }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(categoriesService.list).toHaveBeenCalledWith({ includeInactive: true });
    expect(
      queryClient.getQueryData(['admin', 'categories', { includeInactive: true }]),
    ).toBeDefined();
  });
});

describe('useDeleteCategory', () => {
  it("invalidate theo PREFIX ['admin','categories'] để bắt hết mọi biến thể tham số", async () => {
    vi.mocked(categoriesService.remove).mockResolvedValue({} as never);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteCategory(), { wrapper });
    result.current.mutate('cat-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'categories'] });
    expect(useToastStore.getState().toasts[0]?.message).toBe('Đã xoá danh mục');
  });
});

describe('useFolders — cây thư mục tải dần từng cấp (docs/12 Phase 4)', () => {
  it('enabled: false → KHÔNG gọi API (node chưa được mở rộng)', async () => {
    vi.mocked(foldersService.list).mockResolvedValue([] as never);
    renderHook(() => useFolders('folder-1', { enabled: false }), { wrapper });
    await new Promise((r) => setTimeout(r, 10));
    expect(foldersService.list).not.toHaveBeenCalled();
  });

  it('enabled: true → gọi service với đúng parentId', async () => {
    vi.mocked(foldersService.list).mockResolvedValue([] as never);
    const { result } = renderHook(() => useFolders('folder-1', { enabled: true }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(foldersService.list).toHaveBeenCalledWith('folder-1');
  });

  it("bỏ trống parentId → queryKey dùng 'root', không phải undefined (tránh lẫn cache)", async () => {
    vi.mocked(foldersService.list).mockResolvedValue([] as never);
    renderHook(() => useFolders(undefined), { wrapper });
    await waitFor(() => expect(queryClient.getQueryData(['folders', 'root'])).toBeDefined());
  });
});

describe('useCreateFolder / useDeleteFolder', () => {
  it('tạo thư mục thành công → invalidate cache + toast', async () => {
    vi.mocked(foldersService.create).mockResolvedValue({ id: 'f1' } as never);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateFolder(), { wrapper });
    result.current.mutate({ name: 'Ảnh sản phẩm', parentId: null });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['folders'] });
    expect(useToastStore.getState().toasts[0]?.message).toBe('Đã tạo thư mục');
  });

  it('xoá thư mục còn file/thư mục con → 409 FOLDER_NOT_EMPTY hiện đúng message backend', async () => {
    const { AxiosError, AxiosHeaders } = await import('axios');
    const err = new AxiosError('failed');
    err.response = {
      data: { message: 'Thư mục vẫn còn thư mục con hoặc file', code: 'FOLDER_NOT_EMPTY' },
      status: 409,
      statusText: '',
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    };
    vi.mocked(foldersService.remove).mockRejectedValue(err);

    const { result } = renderHook(() => useDeleteFolder(), { wrapper });
    result.current.mutate('f1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useToastStore.getState().toasts[0]).toMatchObject({
      message: 'Thư mục vẫn còn thư mục con hoặc file',
      type: 'error',
    });
  });
});

describe('useUploadFile / useDeleteFile', () => {
  it('tải lên thành công → invalidate cache files (danh sách tự cập nhật)', async () => {
    vi.mocked(filesService.upload).mockResolvedValue({ id: 'file1', url: 'https://x/1.png' } as never);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUploadFile(), { wrapper });
    result.current.mutate({ file: new File(['x'], 'a.png'), folderId: null });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['files'] });
  });

  it('tải lên lỗi → hiện toast lỗi (trước đây KHÔNG có phản hồi gì cho người dùng)', async () => {
    vi.mocked(filesService.upload).mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useUploadFile(), { wrapper });
    result.current.mutate({ file: new File(['x'], 'a.png') });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useToastStore.getState().toasts[0]).toMatchObject({
      message: 'Không tải được ảnh lên',
      type: 'error',
    });
  });

  it('xoá file thành công → invalidate cache + toast', async () => {
    vi.mocked(filesService.remove).mockResolvedValue(undefined as never);
    const { result } = renderHook(() => useDeleteFile(), { wrapper });
    result.current.mutate('file1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useToastStore.getState().toasts[0]?.message).toBe('Đã xoá file');
  });
});

describe('useSystemSettings / useUpdateSystemSetting (docs/12, Phase 4)', () => {
  it("dùng queryKey ['admin','settings'] để invalidate được thống nhất", async () => {
    vi.mocked(systemSettingsService.list).mockResolvedValue([] as never);
    renderHook(() => useSystemSettings(), { wrapper });
    await waitFor(() => expect(queryClient.getQueryData(['admin', 'settings'])).toBeDefined());
  });

  it('cập nhật thành công → invalidate cache + toast', async () => {
    vi.mocked(systemSettingsService.update).mockResolvedValue({
      key: 'site_name',
      value: 'Tên mới',
    } as never);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateSystemSetting(), { wrapper });
    result.current.mutate({ key: 'site_name', value: 'Tên mới' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'settings'] });
    expect(useToastStore.getState().toasts[0]?.message).toBe('Đã lưu thay đổi');
  });

  it('403 REGISTRATION_DISABLED (hay lỗi 422 giá trị sai kiểu) → hiện đúng message backend trả về', async () => {
    const { AxiosError, AxiosHeaders } = await import('axios');
    const err = new AxiosError('failed');
    err.response = {
      data: { message: 'Validation failed', errors: { value: 'Expected boolean, received string' } },
      status: 422,
      statusText: '',
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    };
    vi.mocked(systemSettingsService.update).mockRejectedValue(err);

    const { result } = renderHook(() => useUpdateSystemSetting(), { wrapper });
    result.current.mutate({ key: 'registration_enabled', value: 'not-a-boolean' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useToastStore.getState().toasts[0]).toMatchObject({
      message: 'Validation failed',
      type: 'error',
    });
  });
});
