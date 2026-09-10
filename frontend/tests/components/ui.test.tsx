import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Switch } from "@/components/ui/Switch";

describe("Button", () => {
  it("render nội dung và gọi onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Lưu thay đổi</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("loading → hiện 'Đang xử lý...' và TỰ VÔ HIỆU HOÁ (chống double-submit)", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Lưu
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Đang xử lý...");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("disabled chặn click", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Xoá
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it.each(["primary", "outline", "ghost", "danger"] as const)("hỗ trợ biến thể %s", (variant) => {
    const { container } = render(<Button variant={variant}>X</Button>);
    expect(container.querySelector("button")?.className).not.toBe("");
  });

  it("truyền tiếp thuộc tính HTML gốc (vd type=submit)", () => {
    render(<Button type="submit">Gửi</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });
});

describe("FormField", () => {
  it("label liên kết đúng input qua id (accessibility)", () => {
    render(<FormField label="Email" name="email" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("id", "email");
    expect(input).toHaveAttribute("name", "email");
  });

  it("id truyền vào được ưu tiên hơn name", () => {
    render(<FormField label="Email" name="email" id="email-dang-nhap" />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("id", "email-dang-nhap");
  });

  it("hiện thông điệp lỗi và đổi màu viền khi có error", () => {
    const { container } = render(
      <FormField label="Email" name="email" error={{ type: "manual", message: "Email không hợp lệ" }} />,
    );
    expect(screen.getByText("Email không hợp lệ")).toBeInTheDocument();
    expect(container.querySelector("input")?.className).toContain("border-red-400");
  });

  it("không có error thì không render phần thông báo lỗi", () => {
    const { container } = render(<FormField label="Email" name="email" />);
    expect(container.querySelector("p")).toBeNull();
  });

  it("nhập được nội dung", async () => {
    render(<FormField label="Họ tên" name="fullName" />);
    await userEvent.type(screen.getByLabelText("Họ tên"), "Nguyễn Văn A");
    expect(screen.getByLabelText("Họ tên")).toHaveValue("Nguyễn Văn A");
  });
});

describe("Switch", () => {
  it("dùng role=switch + aria-checked (đọc được bằng screen reader)", () => {
    render(<Switch checked onChange={vi.fn()} label="Bật đăng nhập Google" />);
    const control = screen.getByRole("switch", { name: "Bật đăng nhập Google" });
    expect(control).toHaveAttribute("aria-checked", "true");
  });

  it("gọi onChange khi bấm", async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="Magic link" />);
    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("disabled thì không gọi onChange (dùng khi đang lưu hoặc bị backend chặn)", async () => {
    const onChange = vi.fn();
    render(<Switch checked disabled onChange={onChange} label="Email/mật khẩu" />);
    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("type=button — không vô tình submit form bao ngoài", () => {
    render(<Switch checked={false} onChange={vi.fn()} label="X" />);
    expect(screen.getByRole("switch")).toHaveAttribute("type", "button");
  });
});
