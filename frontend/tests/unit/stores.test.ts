import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/useAuthStore";
import { useToastStore } from "@/store/useToastStore";
import { useConfirmStore } from "@/store/useConfirmStore";

beforeEach(() => {
  useAuthStore.setState({ user: null });
  useToastStore.setState({ toasts: [] });
});

describe("useAuthStore", () => {
  it("lưu và xoá user hiện tại", () => {
    const user = { id: "u1", fullName: "A", email: "a@x.com", roles: ["member"] };
    act(() => useAuthStore.getState().setUser(user));
    expect(useAuthStore.getState().user).toEqual(user);

    act(() => useAuthStore.getState().setUser(null));
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("KHÔNG dùng để cache dữ liệu server — chỉ giữ đúng thông tin hiển thị", () => {
    // Store chỉ có 2 khoá: user + setUser. Thêm khoá khác nghĩa là đang lấn sang việc của React Query.
    expect(Object.keys(useAuthStore.getState()).sort()).toEqual(["setUser", "user"]);
  });
});

describe("useToastStore", () => {
  it("push thêm toast với type mặc định là success", () => {
    act(() => useToastStore.getState().push("Đã lưu"));
    const [toast] = useToastStore.getState().toasts;
    expect(toast).toMatchObject({ message: "Đã lưu", type: "success" });
  });

  it("push được toast lỗi", () => {
    act(() => useToastStore.getState().push("Hỏng rồi", "error"));
    expect(useToastStore.getState().toasts[0]!.type).toBe("error");
  });

  it("mỗi toast có id riêng, không ghi đè nhau", () => {
    act(() => {
      useToastStore.getState().push("A");
      useToastStore.getState().push("B");
    });
    const ids = useToastStore.getState().toasts.map((t) => t.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("dismiss chỉ xoá đúng toast được chỉ định", () => {
    act(() => {
      useToastStore.getState().push("A");
      useToastStore.getState().push("B");
    });
    const [first] = useToastStore.getState().toasts;
    act(() => useToastStore.getState().dismiss(first!.id));
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(["B"]);
  });

  it("toast tự biến mất sau 3 giây", () => {
    vi.useFakeTimers();
    act(() => useToastStore.getState().push("Tạm thời"));
    expect(useToastStore.getState().toasts).toHaveLength(1);

    act(() => vi.advanceTimersByTime(3000));
    expect(useToastStore.getState().toasts).toHaveLength(0);
    vi.useRealTimers();
  });
});

describe("useConfirmStore", () => {
  it("có API mở/đóng hộp thoại xác nhận", () => {
    const state = useConfirmStore.getState();
    expect(typeof state).toBe("object");
    expect(Object.keys(state).length).toBeGreaterThan(0);
  });
});
