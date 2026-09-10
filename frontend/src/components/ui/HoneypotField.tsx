type Props = {
  name?: string;
  value: string;
  onChange: (value: string) => void;
};

// Field ẩn chống bot spam form — bot điền form tự động thường điền vào MỌI input nhìn thấy trong DOM
// (khác input type="hidden", nhiều bot lọc field đó ra trước khi điền). Ẩn khỏi người dùng thật bằng
// CSS đưa hẳn ra ngoài màn hình (không dùng display:none — một số bot bỏ qua field display:none) +
// aria-hidden/tabIndex=-1 để trình đọc màn hình và điều hướng bàn phím bỏ qua hoàn toàn, không ai vô
// tình điền nhầm. Server coi field này CÓ giá trị (kể cả chỉ khoảng trắng) là dấu hiệu bot — xem
// backend orders.service.ts / docs/modules/domain-orders.md.
export function HoneypotField({ name = 'website', value, onChange }: Props) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
      <label htmlFor={name}>Để trống trường này</label>
      <input
        id={name}
        name={name}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
