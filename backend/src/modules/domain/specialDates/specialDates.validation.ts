import { z } from "zod";

// Chỉ THÁNG-NGÀY có ý nghĩa (lặp lại hằng năm) — vẫn bắt nhập đủ 'YYYY-MM-DD' cho đơn giản (khách
// chọn qua <input type="date">), năm nhập vào không ảnh hưởng gì tới lúc tính ngày nhắc, xem
// specialDates.service.ts.
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const createSpecialDateSchema = z.object({
  label: z.string().trim().min(1, "Vui lòng nhập tên dịp (vd: Sinh nhật mẹ)").max(100),
  date: z.string().regex(isoDatePattern, "Ngày không hợp lệ (định dạng YYYY-MM-DD)"),
  // Nhắc trước bao nhiêu ngày — 0 = nhắc ĐÚNG ngày đó. Tối đa 30 ngày, đủ dùng cho việc chuẩn bị hoa,
  // không cần nhắc trước quá xa.
  remindDaysBefore: z.number().int().min(0).max(30).optional(),
});
export type CreateSpecialDateInput = z.infer<typeof createSpecialDateSchema>;

export const updateSpecialDateSchema = createSpecialDateSchema.partial();
export type UpdateSpecialDateInput = z.infer<typeof updateSpecialDateSchema>;

export const specialDateIdParamSchema = z.object({ id: z.string().uuid() });
