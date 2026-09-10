import { describe, expect, it } from "vitest";
import { formatDeliveryDate } from "@/lib/date";

describe("formatDeliveryDate", () => {
  // Hồi quy cho bug timezone THẬT đã gặp ở backend (orders.service.ts): deliveryDate là cột @db.Date
  // (chỉ có ý nghĩa ngày), lưu dưới dạng UTC midnight — format LUÔN phải đọc timeZone 'UTC', nếu đọc
  // theo múi giờ trình duyệt (vd UTC âm) sẽ hiển thị NHẦM SANG NGÀY HÔM TRƯỚC dù backend đã lưu đúng.
  it("hiển thị đúng ngày UTC, không lệch theo múi giờ trình duyệt", () => {
    expect(formatDeliveryDate("2026-12-25T00:00:00.000Z")).toBe("25/12/2026");
  });

  it("giữ nguyên ngày ngay cả khi giờ UTC gần biên nửa đêm", () => {
    expect(formatDeliveryDate("2026-01-01T00:00:00.000Z")).toBe("01/01/2026");
  });
});
