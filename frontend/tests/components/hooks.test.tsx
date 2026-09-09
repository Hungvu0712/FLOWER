import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/core/account/account.service", () => ({
  accountService: {
    getMe: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    listSessions: vi.fn(),
    revokeSession: vi.fn(),
    revokeOtherSessions: vi.fn(),
  },
}));
vi.mock("@/features/domain/categories/categories.service", () => ({
  categoriesService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

const { accountService } = await import("@/features/core/account/account.service");
const { categoriesService } = await import("@/features/domain/categories/categories.service");
const { useMe, useUpdateProfile } = await import("@/features/core/account/account.hooks");
const { useCategories, useDeleteCategory } = await import("@/features/domain/categories/categories.hooks");
const { useToastStore } = await import("@/store/useToastStore");

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
});

describe("useMe", () => {
  it("gọi accountService.getMe và trả dữ liệu", async () => {
    vi.mocked(accountService.getMe).mockResolvedValue({ id: "u1", roles: ["member"], permissions: [] } as never);
    const { result } = renderHook(() => useMe(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ id: "u1", roles: ["member"] });
  });

  it("KHÔNG retry khi 401 — khách vãng lai ở trang public là bình thường, không phải lỗi tạm thời", async () => {
    vi.mocked(accountService.getMe).mockRejectedValue(new Error("401"));
    const { result } = renderHook(() => useMe(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(accountService.getMe).toHaveBeenCalledTimes(1);
  });

  it("dùng queryKey ['account','me'] để mọi nơi invalidate được thống nhất", async () => {
    vi.mocked(accountService.getMe).mockResolvedValue({ id: "u1" } as never);
    renderHook(() => useMe(), { wrapper });
    await waitFor(() => expect(queryClient.getQueryData(["account", "me"])).toBeDefined());
  });
});

describe("useUpdateProfile", () => {
  it("thành công → invalidate ['account','me'] và hiện toast", async () => {
    vi.mocked(accountService.updateProfile).mockResolvedValue({ id: "u1" } as never);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateProfile(), { wrapper });
    result.current.mutate({ fullName: "Tên mới" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["account", "me"] });
    expect(useToastStore.getState().toasts[0]).toMatchObject({ message: "Đã lưu thay đổi", type: "success" });
  });

  it("lỗi → hiện toast lỗi lấy đúng message backend trả về", async () => {
    const { AxiosError, AxiosHeaders } = await import("axios");
    const err = new AxiosError("failed");
    err.response = {
      data: { message: "Số điện thoại đã được dùng" },
      status: 409,
      statusText: "",
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    };
    vi.mocked(accountService.updateProfile).mockRejectedValue(err);

    const { result } = renderHook(() => useUpdateProfile(), { wrapper });
    result.current.mutate({ fullName: "X" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useToastStore.getState().toasts[0]).toMatchObject({
      message: "Số điện thoại đã được dùng",
      type: "error",
    });
  });
});

describe("useCategories", () => {
  it("truyền params vào service và đưa params vào queryKey (cache theo bộ lọc)", async () => {
    vi.mocked(categoriesService.list).mockResolvedValue([] as never);
    const { result } = renderHook(() => useCategories({ includeInactive: true }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(categoriesService.list).toHaveBeenCalledWith({ includeInactive: true });
    expect(queryClient.getQueryData(["admin", "categories", { includeInactive: true }])).toBeDefined();
  });
});

describe("useDeleteCategory", () => {
  it("invalidate theo PREFIX ['admin','categories'] để bắt hết mọi biến thể tham số", async () => {
    vi.mocked(categoriesService.remove).mockResolvedValue({} as never);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteCategory(), { wrapper });
    result.current.mutate("cat-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["admin", "categories"] });
    expect(useToastStore.getState().toasts[0]?.message).toBe("Đã xoá danh mục");
  });
});
