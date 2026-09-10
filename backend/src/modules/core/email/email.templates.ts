// Template tối giản (string interpolation) — đủ dùng cho boilerplate.
// Khi cần layout đẹp hơn, thay bằng react-email hoặc mjml mà không đổi email.service.ts.

export function magicLinkTemplate({ url }: { url: string }): string {
  return `
    <p>Chào bạn,</p>
    <p>Nhấn vào liên kết bên dưới để đăng nhập (liên kết chỉ dùng được 1 lần, hết hạn sau ít phút):</p>
    <p><a href="${url}">${url}</a></p>
    <p>Nếu bạn không yêu cầu đăng nhập, hãy bỏ qua email này.</p>
  `;
}

export function passwordResetTemplate({ url }: { url: string }): string {
  return `
    <p>Chào bạn,</p>
    <p>Nhấn vào liên kết bên dưới để đặt lại mật khẩu:</p>
    <p><a href="${url}">${url}</a></p>
    <p>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
  `;
}

export function newPasswordTemplate({ password }: { password: string }): string {
  return `
    <p>Chào bạn,</p>
    <p>Quản trị viên đã đặt lại mật khẩu cho tài khoản của bạn. Mật khẩu mới:</p>
    <p><strong>${password}</strong></p>
    <p>Vui lòng đăng nhập và đổi mật khẩu ngay sau khi truy cập.</p>
  `;
}

// name/phone/email/message đã được escapeHtml() ở contact.service.ts TRƯỚC KHI truyền vào đây — nội
// dung này do khách công khai tự nhập (form Liên hệ, không cần đăng nhập), không escape thì dán thẳng
// HTML/script của khách vào email nội bộ.
export function contactMessageTemplate({
  name,
  phone,
  email,
  message,
}: {
  name: string;
  phone: string;
  email: string | null;
  message: string;
}): string {
  return `
    <p>Có khách vừa gửi form Liên hệ trên website:</p>
    <p><strong>Tên:</strong> ${name}</p>
    <p><strong>Điện thoại:</strong> ${phone}</p>
    ${email ? `<p><strong>Email:</strong> ${email}</p>` : ""}
    <p><strong>Lời nhắn:</strong></p>
    <p>${message.replace(/\n/g, "<br>")}</p>
  `;
}
