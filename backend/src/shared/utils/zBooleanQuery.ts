import { z } from "zod";

// z.coerce.boolean() SAI cho query string params: `Boolean("false")` trả về `true` trong JS (mọi
// chuỗi không rỗng đều truthy), nên "?isHandled=false" bị hiểu nhầm thành `true` — lỗi thật đã xảy ra
// ở contact.validation.ts (lọc "Chưa xử lý" lại trả về tin nhắn "Đã xử lý"). Dùng hàm này cho MỌI
// query param boolean thay vì gọi z.coerce.boolean() trực tiếp — parse đúng chuỗi "true"/"false" mà
// axios thật sự gửi lên (axios serialize boolean thành đúng chuỗi này, không phải "1"/"0").
export function zBooleanQuery() {
  return z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true"));
}
