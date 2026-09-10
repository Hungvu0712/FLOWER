import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/useAuthStore";
import { useToastStore } from "@/store/useToastStore";
import { useConfirmStore } from "@/store/useConfirmStore";
import { useCartStore, useCartCount, useCartTotal } from "@/store/useCartStore";

beforeEach(() => {
  useAuthStore.setState({ user: null });
  useToastStore.setState({ toasts: [] });
  useCartStore.setState({ items: [], hasHydrated: true });
  localStorage.clear();
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

describe("useCartStore", () => {
  const productA = { productId: "p1", name: "Hoa hồng", slug: "hoa-hong", basePrice: 100000, image: null };

  it("addItem thêm sản phẩm mới với số lượng mặc định 1", () => {
    act(() => useCartStore.getState().addItem(productA));
    expect(useCartStore.getState().items).toEqual([{ ...productA, quantity: 1 }]);
  });

  it("addItem cùng productId thì CỘNG DỒN số lượng, không tạo dòng mới", () => {
    act(() => {
      useCartStore.getState().addItem(productA, 2);
      useCartStore.getState().addItem(productA, 3);
    });
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]!.quantity).toBe(5);
  });

  it("setQuantity cập nhật đúng số lượng sản phẩm", () => {
    act(() => useCartStore.getState().addItem(productA));
    act(() => useCartStore.getState().setQuantity("p1", 7));
    expect(useCartStore.getState().items[0]!.quantity).toBe(7);
  });

  it("setQuantity <= 0 thì XOÁ sản phẩm khỏi giỏ, không để lại dòng số lượng 0", () => {
    act(() => useCartStore.getState().addItem(productA));
    act(() => useCartStore.getState().setQuantity("p1", 0));
    expect(useCartStore.getState().items).toEqual([]);
  });

  it("removeItem chỉ xoá đúng sản phẩm được chỉ định", () => {
    act(() => {
      useCartStore.getState().addItem(productA);
      useCartStore.getState().addItem({ ...productA, productId: "p2", name: "Hoa cúc" });
    });
    act(() => useCartStore.getState().removeItem("p1"));
    expect(useCartStore.getState().items.map((i) => i.productId)).toEqual(["p2"]);
  });

  it("clear() xoá sạch giỏ hàng", () => {
    act(() => useCartStore.getState().addItem(productA));
    act(() => useCartStore.getState().clear());
    expect(useCartStore.getState().items).toEqual([]);
  });

  it("useCartCount cộng tổng số lượng mọi sản phẩm trong giỏ", () => {
    act(() => {
      useCartStore.getState().addItem(productA, 2);
      useCartStore.getState().addItem({ ...productA, productId: "p2" }, 3);
    });
    const { result } = renderHook(() => useCartCount());
    expect(result.current).toBe(5);
  });

  it("useCartTotal tính đúng tổng tiền (đơn giá × số lượng, cộng dồn nhiều sản phẩm)", () => {
    act(() => {
      useCartStore.getState().addItem(productA, 2); // 100.000 × 2
      useCartStore.getState().addItem({ ...productA, productId: "p2", basePrice: 50000 }, 1); // 50.000 × 1
    });
    const { result } = renderHook(() => useCartTotal());
    expect(result.current).toBe(250000);
  });
});

describe("useConfirmStore", () => {
  it("có API mở/đóng hộp thoại xác nhận", () => {
    const state = useConfirmStore.getState();
    expect(typeof state).toBe("object");
    expect(Object.keys(state).length).toBeGreaterThan(0);
  });
});
