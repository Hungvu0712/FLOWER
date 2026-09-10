// VND không có đơn vị lẻ — basePrice từ API luôn là số nguyên VND (xem backend Product.basePrice).
const vndFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

export function formatVnd(amount: number): string {
  return vndFormatter.format(amount);
}
