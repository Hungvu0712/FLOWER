// VND không có đơn vị lẻ — basePrice từ API luôn là số nguyên VND (xem backend Product.basePrice).
const vndFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

export function formatVnd(amount: number): string {
  return vndFormatter.format(amount);
}

// Rút gọn cho nhãn trục biểu đồ (không phải số tiền cần chính xác tuyệt đối) — "1,2tr"/"850k".
export function formatVndCompact(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace('.0', '')}tr`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}k`;
  return String(amount);
}
