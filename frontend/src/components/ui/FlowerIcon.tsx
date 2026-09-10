type Props = {
  className?: string;
  color?: string;
};

// Icon hoa trang trí dùng chung (logo, placeholder ảnh sản phẩm khi chưa có ảnh thật) — vẽ SVG thay vì
// emoji để scale/đổi màu được, theo quy ước docs/04 §5.
export function FlowerIcon({ className, color = 'currentColor' }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="7" r="3.2" fill={color} />
      <circle cx="7" cy="12" r="3.2" fill={color} opacity="0.75" />
      <circle cx="17" cy="12" r="3.2" fill={color} opacity="0.75" />
      <circle cx="12" cy="15" r="3.2" fill={color} />
      <line x1="12" y1="16" x2="12" y2="22" stroke="var(--color-sage)" strokeWidth="1.6" />
    </svg>
  );
}
