// Định dạng ngày kiểu Việt Nam (dd/MM/yyyy) cho các cột @db.Date (chỉ có Ý NGHĨA NGÀY, không có múi
// giờ) — LUÔN đọc bằng timeZone 'UTC', KHÔNG dùng múi giờ trình duyệt/server. Ngày này được backend
// lưu dưới dạng UTC midnight (xem orders.service.ts) — nếu format theo múi giờ local (vd Asia/Saigon,
// UTC+7) sẽ không sai (vì local muộn hơn UTC), nhưng ở múi giờ ÂM (vd UTC-5) sẽ hiển thị NHẦM SANG
// NGÀY HÔM TRƯỚC. Luôn cố định 'UTC' để đúng bất kể máy khách ở múi giờ nào.
export function formatDeliveryDate(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(iso),
  );
}
