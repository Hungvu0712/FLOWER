// Điều hướng "cứng" (tải lại trang) — CHỈ dùng ngay sau khi trạng thái đăng nhập đổi (đăng nhập xong,
// hoặc tự phục hồi phiên qua refresh token). router.push/replace ở đúng thời điểm đó từng kẹt người dùng
// ở /login: lúc còn chưa đăng nhập, lần điều hướng tới /account/... bị proxy.ts redirect về /login, và
// Client Cache của Next.js GIỮ kết quả redirect đó (trang tĩnh — giữ tới 5 phút, xem staleTimes) —
// router.push tới đúng trang đó sau khi đăng nhập dùng lại redirect cũ, không hề hỏi lại server (docs/12
// FE-08, tái hiện bằng trace network thật). Tải lại trang cũng xoá luôn cache React Query/kết nối
// socket mở từ lúc chưa đăng nhập hoặc của phiên trước.
// replace (không phải assign) — không để lại /login trong lịch sử trình duyệt, bấm Back không quay về đó.
export function hardRedirect(url: string): void {
  window.location.replace(url);
}
