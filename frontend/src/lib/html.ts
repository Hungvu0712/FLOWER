// Tóm tắt văn bản thuần từ HTML đã sanitize sẵn ở backend (xem sanitizeDescriptionHtml) — dùng cho
// dòng preview ngắn trong danh sách, không phải để hiển thị định dạng đầy đủ (đó là việc của
// RichTextEditor). Regex đơn giản thay vì thao tác DOM — chạy được cả lúc SSR (không có `document`).
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
