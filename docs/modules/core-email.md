# Module: Email 🔧 Core

Lớp trừu tượng gửi email — business logic **không bao giờ** gọi thẳng Resend/Nodemailer.

| | |
|---|---|
| **Loại** | 🔧 Core |
| **Backend** | `modules/core/email/` |
| **Bảng DB** | `email_logs` |
| **Cấu hình** | `EMAIL_PROVIDER` · `EMAIL_FROM` · `RESEND_API_KEY` · `SMTP_*` |

---

## 1. Kiến trúc

```mermaid
flowchart TD
    subgraph CALLERS["Nơi gọi — chỉ biết interface"]
        A1["auth.service<br/>magic link"]
        A2["auth.service<br/>quên mật khẩu"]
        A3["users.admin.service<br/>reset password"]
        A4["🌸 orders.service (sau này)<br/>xác nhận đơn hàng"]
    end

    CALLERS --> ES["email.service.ts<br/>sendEmail({ to, subject, html, type })"]
    ES --> LOG[("email_logs<br/>sent | failed + error")]
    ES --> SEL{"env.EMAIL_PROVIDER"}
    SEL -->|resend| RP["resend.provider.ts"]
    SEL -->|smtp| NP["nodemailer.provider.ts"]
    RP --> IF["EmailProvider interface<br/>send(input): Promise&lt;SendEmailResult&gt;"]
    NP --> IF
    RP --> R["☁️ Resend API"]
    NP --> S["📮 SMTP server"]

    TPL["email.templates.ts<br/>magicLink · passwordReset · newPassword"] -.->|"html"| CALLERS

    style ES fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px,color:#1e3a8a
    style IF fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
```

**Đổi provider = đổi một biến môi trường.** Không sửa dòng code nào ở nơi gọi.

---

## 2. Hai phương án

| | **Resend** | **Nodemailer + SMTP** |
|---|---|---|
| Khi dùng | Production, đã có domain riêng | Tạm thời khi chưa có domain |
| Yêu cầu | Domain đã verify DKIM/SPF/DMARC | Tài khoản SMTP (Gmail cần App Password) |
| Tỉ lệ vào hộp thư đến | Cao | Thấp — dễ vào spam |
| Giới hạn | Theo gói dịch vụ | Gmail ~500 email/ngày |
| Chi phí | Có gói miễn phí | Miễn phí |

> **Không thể dùng địa chỉ Gmail cá nhân làm người gửi với Resend** — bắt buộc phải sở hữu domain và
> cấu hình được DNS. Hướng dẫn từng bước: [09 §3.5](../09-moi-truong-va-bien-cau-hinh.md).

---

## 3. Ghi log mọi lần gửi

```mermaid
flowchart TD
    S["sendEmail()"] --> P["provider.send()"]
    P -->|Thành công| L1[("email_logs<br/>status='sent'<br/>providerMessageId")]
    P -->|Thất bại| E["logger.error(type, to, message)"]
    E --> L2[("email_logs<br/>status='failed'<br/>error = message")]
    L2 --> T["throw lại lỗi gốc<br/>→ CALLER quyết định xử lý"]
    L2 -.->|"ghi log lỗi cũng lỗi"| C["catch(() => {})<br/>không để crash luồng chính"]

    T --> D1["auth: NUỐT lỗi<br/>(chống dò email)"]
    T --> D2["users.admin.resetPassword:<br/>ĐỂ lỗi văng ra<br/>(không ghi mật khẩu mới nếu email hỏng)"]

    style L1 fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
    style L2 fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
```

**Hai nơi gọi xử lý lỗi khác nhau — cả hai đều có chủ đích:**

| Nơi gọi | Xử lý | Vì sao |
|---|---|---|
| `auth.service` (magic link, quên mật khẩu) | `.catch(() => {})` — **nuốt** | Nếu để lỗi văng ra, response 500 sẽ khác nhánh "email không tồn tại" (200) → **lộ email nào có tài khoản** |
| `users.admin.service.resetPassword` | **Để lỗi văng ra** | Gửi email TRƯỚC khi ghi DB — email hỏng thì mật khẩu cũ còn nguyên, tránh đặt mật khẩu mà không ai biết |

**Khi khách báo không nhận được email**, tra bảng `email_logs`:

```sql
SELECT to_email, type, status, error, sent_at
FROM email_logs
WHERE to_email = 'khach@example.com'
ORDER BY sent_at DESC LIMIT 20;
```

---

## 4. Bảo mật

- **Không ghi nội dung email (`html`) vào `email_logs`** — nội dung chứa magic link token và mật khẩu
  mới. Chỉ ghi `to_email`, `type`, `status`, `providerMessageId`, `error`.
- Mật khẩu mới do SuperAdmin reset chỉ tồn tại **trong bộ nhớ** đủ lâu để gửi email —
  không log, không trả về response, không hiển thị lại cho SuperAdmin.
- Template dùng nội suy chuỗi. Hiện chỉ nhận URL và mật khẩu do server sinh (không phải input người
  dùng) nên an toàn. **Nếu sau này nhúng dữ liệu người dùng** (tên khách trong email xác nhận đơn),
  phải escape HTML trước.

---

## 5. Kiểm thử

`backend/tests/unit/modules/email.service.test.ts` — 8 test: chọn provider theo env · ghi `sent`/`failed` ·
ném lại lỗi gốc · lỗi ghi log không làm crash · **không ghi `html` vào log** · template nhúng đúng URL.

---

## 6. Việc còn lại

| Việc | Ưu tiên | Ghi chú |
|---|:---:|---|
| Template đẹp hơn (`react-email` / `mjml`) | 🟢 | Interface `EmailProvider` không đổi |
| Hàng đợi gửi email (BullMQ) | 🟢 | Chỉ khi cần gửi hàng loạt (newsletter, nhắc lịch) |
| Thử lại khi gửi thất bại | 🟢 | Hiện thất bại là mất luôn |
| Escape HTML khi nhúng dữ liệu người dùng | 🟡 | **Bắt buộc** trước khi làm email xác nhận đơn hàng |
| Webhook theo dõi bounce/complaint từ Resend | 🟢 | Giữ danh tiếng domain |
