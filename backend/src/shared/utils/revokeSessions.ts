import { prisma } from "../../config/prisma";

// Thu hồi mọi session ĐANG HOẠT ĐỘNG của 1 user — dùng ở cả 3 luồng đổi mật khẩu (tự đổi, quên mật
// khẩu, superadmin reset hộ). Đổi mật khẩu là hành động người dùng tin rằng sẽ "đuổi" được kẻ xâm
// nhập đang chiếm session — trước đây cả 3 luồng đều KHÔNG làm việc này, refresh token cũ vẫn còn
// hiệu lực tới 30 ngày dù mật khẩu đã đổi. Xem docs/12 BE-01.
//
// `exceptRefreshTokenHash` (tuỳ chọn): CHỪA LẠI đúng 1 phiên — dùng khi người dùng TỰ đổi mật khẩu
// ngay trên thiết bị đang dùng, tránh tự đăng xuất chính mình. Bỏ trống để thu hồi TẤT CẢ — đúng cho
// luồng quên mật khẩu (đang thao tác qua link email, không có "phiên hiện tại" nào để chừa) và
// superadmin reset hộ (mục đích chính thường là CẮT quyền truy cập, càng phải thu hồi hết).
export async function revokeAllUserSessions(
  userId: string,
  exceptRefreshTokenHash?: string,
): Promise<void> {
  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptRefreshTokenHash && { refreshTokenHash: { not: exceptRefreshTokenHash } }),
    },
    data: { revokedAt: new Date() },
  });
}
