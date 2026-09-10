// Escape HTML entities cho dữ liệu người dùng nhập TRƯỚC KHI chèn vào template email (string
// interpolation thuần, xem modules/core/email/email.templates.ts) — khác sanitizeHtml.ts (cho phép
// một số thẻ định dạng vào rich text editor), ở đây KHÔNG có thẻ nào được phép lọt qua, vì input (tên/
// SĐT/lời nhắn liên hệ) chỉ nên là văn bản thuần, không có lý do chính đáng nào chứa HTML thật.
const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch] as string);
}
