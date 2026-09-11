import sanitizeHtml from "sanitize-html";

// Danh sách thẻ/thuộc tính CHO PHÉP khớp đúng bộ nút trên thanh công cụ rich text editor ở frontend
// (xem RichTextEditor.tsx) — không phải danh sách "mọi thẻ HTML an toàn". Thắt chặt ở đây theo kiểu
// allowlist thay vì chặn từng thẻ nguy hiểm (blocklist) — an toàn hơn khi có thẻ mới xuất hiện sau này
// mà quên cập nhật danh sách chặn. Không cho phép attribute nào (kể cả href) — mô tả sản phẩm không
// cần link, giảm bề mặt tấn công (vd `javascript:` URL, `onclick` qua thuộc tính lạ).
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "blockquote",
];

// Sanitize NGAY TRƯỚC KHI LƯU DB (không phải lúc hiển thị) — mọi nơi đọc `description` sau này (admin
// panel, storefront...) đều nhận HTML đã sạch sẵn, không phải tự nhớ sanitize lại từng chỗ hiển thị.
export function sanitizeDescriptionHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {},
    disallowedTagsMode: "discard",
  });
}
